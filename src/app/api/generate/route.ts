import { GoogleGenAI } from "@google/genai";
import { Flashcard } from "@/types/flashcard";
import { createClient } from "@/utils/supabase/server";
import { CATEGORY_TRANSLATIONS, getBestIcon, normalizeString, generateSlug } from "@/utils/categoryUtils";

export const runtime = "edge";
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    try {
        const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;

        if (!apiKey) {
            console.error("Generate API: API Key is missing");
            return Response.json({ error: "API Key is missing" }, { status: 500 });
        }

        const body = await req.json();
        const {
            topic,
            count = 5,
            userId,
            category: userCategory,
            flashcards: generatedFlashcards,
            saveOnly,
            currentCount = 0
        } = body;

        if (saveOnly && generatedFlashcards) {
            console.log("Generate API: saveOnly mode detected. Skipping AI generation.");
            const result = await saveToDatabase({
                normalized_topic: topic,
                flashcards: generatedFlashcards
            }, userId, topic, userCategory, count, currentCount);
            return Response.json(result);
        }

        // Security Check: CRON_SECRET for automated jobs or valid userId
        const cronSecret = process.env.CRON_SECRET;
        const authHeader = req.headers.get("Authorization");
        const isCron = cronSecret && authHeader === `Bearer ${cronSecret}`;

        if (!topic) {
            return Response.json({ error: "Topic is required" }, { status: 400 });
        }

        const supabase = await createClient();

        // Check for existing sets
        let existingQuestions: string[] = [];
        let existingCount = 0;
        const { data: existingSet } = await supabase
            .from("flashcard_sets")
            .select("cards")
            .ilike("normalized_topic", topic.trim())
            .limit(1)
            .maybeSingle();

        if (existingSet?.cards && Array.isArray(existingSet.cards)) {
            existingQuestions = existingSet.cards.map((c: any) => c.front);
            existingCount = existingSet.cards.length;
        }

        const genAI = new GoogleGenAI({ apiKey, apiVersion: 'v1beta' });
        const models = ['gemini-3-flash-preview', 'gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemma-3-27b-it'];

        // Over-generate by 50% to create buffer for filtering
        const bufferCount = Math.ceil(count * 1.5);

        const categoryInstruction = userCategory
            ? `- Use "${userCategory}" as the category (user-provided).`
            : `- Assign a 1-2 word Vietnamese category (e.g., Công nghệ, Y tế, Lịch sử, Ngôn ngữ, Khoa học, Kinh doanh, Toán học).`;

        const avoidInstruction = existingQuestions.length > 0
            ? `- CRITICAL: The topic already has ${existingCount} flashcards. AVOID THESE EXACT QUESTIONS:
               ${existingQuestions.slice(0, 15).map(q => `"${q}"`).join(", ")}
               - Instead, generate COMPLETELY NEW questions on different aspects, advanced concepts, or deeper insights.
               - DO NOT rephrase existing questions. Create genuinely NEW content.`
            : "";

        const prompt = `Your task is a two-step educational process for the topic: "${topic}".
        
        Step 1: Normalize the topic name into a standard database key.
        - Rules: English, Title Case (e.g., "Python Programming").
        - Programming: Use "[Language] Programming" (e.g., "học python" -> "Python Programming").
        - Subject Mapping: JS/Javascript -> "JavaScript Programming", Py/Python -> "Python Programming", React -> "React Framework".
        - Focus: Core subject only, ignore filler words like "học", "cơ bản", "basics".

        Step 2: Categorize this topic.
        ${categoryInstruction}

        Step 3: Generate EXACTLY ${bufferCount} high-quality educational flashcards for this topic.
        - LANGUAGE REQUIREMENT: ALL cards MUST be in Vietnamese.
        - Front: Vietnamese question/term
        - Back: Vietnamese explanation (can include English terms in parentheses if needed)
        - Structure: Question/Term on the front, Answer/Definition on the back.
        ${avoidInstruction}

        Return ONLY a raw JSON object with this exact structure:
        {
          "normalized_topic": "Consolidated Title",
          "category": "Category Label",
          "flashcards": [{"front": "...", "back": "..."}]
        }
        
        Do not include markdown headers, backticks, or any other text.`;

        console.log(`Generate API: Streaming Conversion for: ${topic} (requesting ${bufferCount} cards with ${count} target)`);

        let lastError: any = null;

        for (const modelName of models) {
            try {
                if (isCron) {
                    // NON-STREAMING FLOW for Cron
                    console.log(`Generate API: Cron detected. Using non-streaming flow with model ${modelName}.`);
                    const result = await genAI.models.generateContent({
                        model: modelName,
                        contents: [{
                            // @ts-ignore
                            role: 'user',
                            parts: [{ text: prompt }]
                        }],
                    });

                    const responseText = (result as any).text || (result as any).response?.text?.() || "";

                    const data = JSON.parse(responseText);
                    if (data.flashcards && data.normalized_topic) {
                        const finalCategory = userCategory || data.category || null;
                        await saveToDatabase(data, userId as string | undefined, topic as string, finalCategory, count, existingCount);
                        return Response.json({
                            success: true,
                            topic: data.normalized_topic,
                            count: data.flashcards.length
                        });
                    }
                    throw new Error("Invalid AI response structure");
                }

                // STREAMING FLOW for regular users
                console.log(`Generate API: Trying Streaming with model ${modelName} via v1beta...`);

                const result = await genAI.models.generateContentStream({
                    model: modelName,
                    contents: [{
                        // @ts-ignore
                        role: 'user',
                        parts: [{ text: prompt }]
                    }],
                });

                console.log(`Generate API: Model ${modelName} stream started!`);

                const encoder = new TextEncoder();
                const stream = new ReadableStream({
                    async start(controller) {
                        let fullResponse = "";
                        try {
                            for await (const chunk of result) {
                                const chunkText = chunk.text;
                                if (chunkText) {
                                    fullResponse += chunkText;
                                    controller.enqueue(encoder.encode(chunkText));
                                }
                            }
                            controller.close();
                        } catch (err: any) {
                            console.error(`Generate API: Error during stream from ${modelName}:`, err);
                            controller.error(err);
                        }
                    }
                });

                return new Response(stream, {
                    headers: {
                        "Content-Type": "text/event-stream; charset=utf-8",
                        "Cache-Control": "no-cache, no-transform",
                        "X-Accel-Buffering": "no",
                        "X-Content-Type-Options": "nosniff",
                        "x-no-compression": "1",
                    },
                });

            } catch (err: any) {
                lastError = err;
                const status = err.status || err.code;
                console.warn(`Generate API: Model ${modelName} failed to start stream (Status: ${status})`);

                if (status === 429 || status === 503 || status === 404 || err.message?.includes("429") || err.message?.includes("Quota")) {
                    console.log(`Generate API: Falling back from ${modelName}...`);
                    continue;
                } else {
                    throw err;
                }
            }
        }

        throw lastError || new Error("All models failed to initiate streaming.");

    } catch (error: any) {
        console.error("Generate API: Fatal Error:", error);

        let status = 500;
        let response = { error: error.message || "Internal Server Error" };

        if (error.status === 429 || error.code === 429 || error.message?.includes("429") || error.message?.includes("Quota")) {
            status = 429;
            response = { error: "rate_limit" } as any;
        }

        return Response.json(response, { status });
    }
}

const ICONS = ["Tag", "Code", "Brain", "Heart", "Globe", "Microscope", "BookOpen", "Cpu", "Briefcase", "Music", "Languages", "Calculator", "Palette", "TrendingUp", "Zap"];
const COLORS = ["blue", "emerald", "amber", "purple", "cyan", "rose", "pink", "orange", "indigo", "slate"];

function normalizeText(text: string): string {
    return text
        .toLowerCase()
        .trim()
        .replace(/[.,?!;:]/g, '')
        .replace(/\s+/g, ' ');
}

function smartMergeCards(existing: Flashcard[], incoming: Flashcard[]): Flashcard[] {
    const cardMap = new Map<string, Flashcard>();

    // Add existing cards to map
    existing.forEach(card => {
        const key = normalizeText(card.front);
        cardMap.set(key, card);
    });

    // Merge incoming cards - keep longer back if duplicate
    incoming.forEach(card => {
        const key = normalizeText(card.front);
        const existingCard = cardMap.get(key);

        if (!existingCard) {
            cardMap.set(key, card);
        } else {
            // Keep the card with longer back text
            if (card.back.length > existingCard.back.length) {
                cardMap.set(key, card);
            }
        }
    });

    return Array.from(cardMap.values());
}

function sanitizeFlashcards(cards: any[]): Flashcard[] {
    if (!Array.isArray(cards)) return [];

    return cards
        .filter(card =>
            card &&
            typeof card === 'object' &&
            typeof card.front === 'string' &&
            typeof card.back === 'string' &&
            card.front.trim().length > 0 &&
            card.back.trim().length > 0
        )
        .map(card => ({
            front: card.front.trim(),
            back: card.back.trim()
        }));
}

async function resolveCategoryId(supabase: any, categoryName: string | null): Promise<{ id: string, name: string } | null> {
    if (!categoryName || categoryName.trim() === '') return null;

    const rawCat = categoryName.trim();
    const normalizedCat = normalizeString(rawCat);
    const translatedName = CATEGORY_TRANSLATIONS[normalizedCat] || rawCat;
    let slug = generateSlug(translatedName);

    if (slug === 'khac' || slug === 'chua-phan-loai') {
        slug = 'chua-phan-loai';
    }

    const { data: existingCat, error: lookupErr } = await supabase
        .from('categories')
        .select('id, name')
        .eq('slug', slug)
        .single();

    if (existingCat?.id) {
        return { id: existingCat.id, name: existingCat.name };
    }

    if (lookupErr && lookupErr.code !== 'PGRST116') {
        console.error("Resolve Category lookup error:", lookupErr);
    }

    const bestIcon = getBestIcon(translatedName);
    const randomColor = COLORS[Math.floor(Math.random() * COLORS.length)];
    const finalName = slug === 'chua-phan-loai' ? 'Chưa phân loại' : translatedName;

    const { data: newCat, error: insertErr } = await supabase
        .from('categories')
        .insert([{
            name: finalName,
            slug: slug,
            icon: slug === 'chua-phan-loai' ? 'Tag' : bestIcon,
            color: slug === 'chua-phan-loai' ? 'slate' : randomColor
        }])
        .select('id')
        .single();

    if (insertErr) {
        console.error("Failed to auto-create category:", insertErr);
        const { data: retryCat } = await supabase.from('categories').select('id, name').eq('slug', slug).single();
        return retryCat ? { id: retryCat.id, name: retryCat.name } : null;
    }

    console.log(`Generate API: Auto-created new category: "${finalName}"`);
    return { id: (newCat as any).id, name: finalName };
}

async function saveToDatabase(
    data: any,
    userId: string | undefined,
    originalTopic: string,
    category?: string | null,
    requestedCount: number = 5,
    currentCount: number = 0
): Promise<{ added: number, filtered: number, total: number, fullSet: Flashcard[] }> {
    try {
        const supabase = await createClient();
        const { normalized_topic, flashcards } = data;
        const normLower = normalized_topic.toLowerCase().trim();

        console.log(`Generate API: Background Save - Processing "${normalized_topic}"...`);
        console.log(`Generate API: Requested ${requestedCount} cards, current set has ${currentCount} cards`);

        const finalCategoryText = category || "Chưa phân loại";
        const catInfo = await resolveCategoryId(supabase, finalCategoryText);
        const categoryId = catInfo?.id || null;
        const canonicalCategoryName = catInfo?.name || finalCategoryText;

        const { data: existingSets, error: searchError } = await supabase
            .from("flashcard_sets")
            .select("*")
            .or(`normalized_topic.ilike.${normLower},aliases.cs.{"${originalTopic}"},topic.ilike.${originalTopic}`);

        if (searchError) {
            console.error("Generate API: Search query failed:", searchError);
            throw searchError;
        }

        let finalCards: Flashcard[] = [];
        let addedCount = 0;
        let filteredCount = 0;

        // Sanitize incoming cards first
        const incomingCards = sanitizeFlashcards(flashcards);
        console.log(`Generate API: Sanitized ${incomingCards.length} incoming cards`);

        if (existingSets && existingSets.length > 0) {
            const primarySet = existingSets[0];
            console.log(`Generate API: Found existing set (ID: ${primarySet.id}). Merging...`);

            const currentCards = sanitizeFlashcards(primarySet.cards);
            console.log(`Generate API: Current set has ${currentCards.length} cards`);

            // Smart Merge
            const mergedCards = smartMergeCards(currentCards, incomingCards);
            console.log(`Generate API: After merge, have ${mergedCards.length} unique cards`);

            // CRITICAL: Enforce exact count = currentCount + requestedCount
            const expectedTotalCount = currentCount + requestedCount;
            finalCards = mergedCards.slice(0, expectedTotalCount);

            addedCount = finalCards.length - currentCards.length;
            filteredCount = (currentCards.length + incomingCards.length) - finalCards.length;

            console.log(`Generate API: Final set will have exactly ${finalCards.length} cards (expected: ${expectedTotalCount})`);
            console.log(`Generate API: Added ${addedCount} new cards, filtered ${filteredCount} duplicates`);

            const contributors = new Set(primarySet.contributor_ids || []);
            if (userId) contributors.add(userId);
            if (primarySet.user_id) contributors.add(primarySet.user_id);

            const aliases = new Set(primarySet.aliases || []);
            aliases.add(originalTopic);
            if (primarySet.topic) aliases.add(primarySet.topic);

            // CRITICAL: Pass raw array, NOT stringified
            const updatePayload: Record<string, any> = {
                cards: finalCards,  // Raw array, Supabase handles JSONB
                contributor_ids: Array.from(contributors).filter(Boolean),
                aliases: Array.from(aliases).filter(Boolean),
                // DO NOT include updated_at - let DB handle it
            };

            if (category) {
                updatePayload.category = canonicalCategoryName;
                updatePayload.category_id = categoryId;
            } else if (!primarySet.category_id && categoryId) {
                updatePayload.category = canonicalCategoryName;
                updatePayload.category_id = categoryId;
            }

            const { error: updateError } = await supabase
                .from("flashcard_sets")
                .update(updatePayload)
                .eq("id", primarySet.id);

            if (updateError) {
                console.error("Generate API: Update failed:", updateError);
                throw updateError;
            }
            console.log(`Generate API: Successfully merged into ID: ${primarySet.id}`);
        } else {
            // New entry
            console.log(`Generate API: Creating new set for "${normalized_topic}".`);

            // For new sets, take exactly requestedCount cards
            finalCards = incomingCards.slice(0, requestedCount);
            addedCount = finalCards.length;
            filteredCount = incomingCards.length - finalCards.length;

            console.log(`Generate API: New set will have ${finalCards.length} cards`);

            const { error: insertError } = await supabase
                .from("flashcard_sets")
                .insert({
                    topic: originalTopic,
                    normalized_topic: normalized_topic,
                    cards: finalCards,  // Raw array, NOT stringified
                    user_id: userId || null,
                    contributor_ids: userId ? [userId] : [],
                    aliases: [originalTopic],
                    category: canonicalCategoryName,
                    category_id: categoryId
                });

            if (insertError) {
                console.error("Generate API: Insert failed:", insertError);
                throw insertError;
            }
            console.log(`Generate API: Successfully created new set.`);
        }

        return {
            added: addedCount,
            filtered: filteredCount,
            total: finalCards.length,
            fullSet: finalCards
        };
    } catch (err: any) {
        console.error("Generate API: saveToDatabase Error:", err.message);
        throw err;
    }
}