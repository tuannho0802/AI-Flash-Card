import { createClient } from "@/utils/supabase/server";
import { Flashcard } from "@/types/flashcard";

export const runtime = "edge";
export const dynamic = 'force-dynamic';

function normalizeText(text: string): string {
    return text
        .toLowerCase()
        .trim()
        .replace(/[.,?!;:]/g, '')
        .replace(/\s+/g, ' ');
}

function hasVietnamese(text: string): boolean {
    const vnRegex = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;
    return vnRegex.test(text);
}

function isEnglishOnly(card: Flashcard): boolean {
    // Strict check: No Vietnamese characters at all in front OR back
    return !hasVietnamese(card.front) && !hasVietnamese(card.back);
}

/**
 * Smart merge logic with language priority:
 * 1. Prioritize Vietnamese back text.
 * 2. If one is Vietnamese and exists within 80% similarity of an English card, favor Vietnamese.
 * 3. If same language, keep longer/more detailed back.
 */
function smartMergeCards(cards: Flashcard[]): { merged: Flashcard[], removedCount: number } {
    const cardMap = new Map<string, Flashcard>();
    let removedCount = 0;

    cards.forEach(card => {
        if (!card.front || !card.back) return;

        const key = normalizeText(card.front);
        const existing = cardMap.get(key);

        if (!existing) {
            cardMap.set(key, card);
        } else {
            removedCount++;

            const existingHasVN = hasVietnamese(existing.back);
            const currentHasVN = hasVietnamese(card.back);

            if (currentHasVN && !existingHasVN) {
                // Current is Vietnamese, existing is English -> Keep current
                cardMap.set(key, card);
            } else if (!currentHasVN && existingHasVN) {
                // Existing is Vietnamese, current is English -> Keep existing
            } else {
                // Same Priority Level (Both VN or Both EN): Keep longer/more detailed back
                if (card.back.length > existing.back.length) {
                    cardMap.set(key, card);
                }
            }
        }
    });

    return { merged: Array.from(cardMap.values()), removedCount };
}

export async function POST(req: Request) {
    const encoder = new TextEncoder();

    return new Response(new ReadableStream({
        async start(controller) {
            try {
                const supabase = await createClient();

                // Admin Check
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) {
                    controller.enqueue(encoder.encode(JSON.stringify({ error: "Unauthorized" })));
                    controller.close();
                    return;
                }

                const { data: profile } = await supabase
                    .from("profiles")
                    .select("role")
                    .eq("id", user.id)
                    .single();

                if (profile?.role !== "admin") {
                    controller.enqueue(encoder.encode(JSON.stringify({ error: "Forbidden" })));
                    controller.close();
                    return;
                }

                const body = await req.json();
                const { dryRun = true } = body;

                // Fetch all sets
                const { data: allSets, error: fetchErr } = await supabase
                    .from("flashcard_sets")
                    .select("id, topic, cards, normalized_topic");

                if (fetchErr) throw fetchErr;

                let totalProcessed = 0;
                let totalRemoved = 0;
                let setsUpdated = 0;
                const potentialIssues: any[] = [];
                const totalSets = allSets.length;

                for (const set of allSets) {
                    totalProcessed++;

                    // Send progress update every set or every 5 sets
                    controller.enqueue(encoder.encode(JSON.stringify({
                        type: "progress",
                        current: totalProcessed,
                        total: totalSets,
                        topic: set.topic
                    }) + "\n"));

                    const cards = set.cards as Flashcard[];
                    if (!Array.isArray(cards)) continue;

                    // 1. Deduplicate & Merge
                    const { merged, removedCount } = smartMergeCards(cards);

                    // 2. Identify Potential Issues
                    const topicLower = set.topic.toLowerCase();
                    const isEnglishLearningTopic = topicLower.includes("tiếng anh") ||
                        topicLower.includes("english") ||
                        topicLower.includes("ielts") ||
                        topicLower.includes("toeic");

                    if (!isEnglishLearningTopic) {
                        merged.forEach(card => {
                            if (isEnglishOnly(card)) {
                                potentialIssues.push({
                                    setId: set.id,
                                    topic: set.topic,
                                    card: card
                                });
                            }
                        });
                    }

                    // 3. Update
                    if (removedCount > 0) {
                        totalRemoved += removedCount;
                        setsUpdated++;

                        if (!dryRun) {
                            const { error: updateErr } = await supabase
                                .from("flashcard_sets")
                                .update({ cards: merged })
                                .eq("id", set.id);

                            if (updateErr) console.error(`Update failed:`, updateErr);
                        }
                    }

                    // Small delay to prevent blocking the event loop too much and allow stream to flush
                    await new Promise(r => setTimeout(r, 10));
                }

                // Send final result
                controller.enqueue(encoder.encode(JSON.stringify({
                    type: "complete",
                    success: true,
                    dryRun,
                    summary: {
                        totalProcessed,
                        setsUpdated,
                        cardsRemoved: totalRemoved,
                        potentialIssuesCount: potentialIssues.length
                    },
                    potentialIssues: potentialIssues.slice(0, 50)
                }) + "\n"));

                controller.close();

            } catch (error: any) {
                console.error("Sanitize API Error:", error);
                controller.enqueue(encoder.encode(JSON.stringify({ type: "error", error: error.message })));
                controller.close();
            }
        }
    }), {
        headers: {
            "Content-Type": "application/x-ndjson",
            "Cache-Control": "no-cache",
        }
    });
}
