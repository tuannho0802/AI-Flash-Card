import { GoogleGenAI } from "@google/genai";
import { createClient } from "@/utils/supabase/server";

export const runtime = "edge";
export const dynamic = "force-dynamic";

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Model Rotation: ordered by priority. On 429, try the next one.
const FALLBACK_MODELS = ['gemini-3-flash-preview', 'gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemma-3-27b-it'];

export async function GET(req: Request) {
    return HandleBackfill(req);
}

export async function POST(req: Request) {
    return HandleBackfill(req);
}

async function HandleBackfill(req: Request) {
    try {
        const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
        if (!apiKey) return Response.json({ error: "API Key missing" }, { status: 500 });

        // Security: require CRON_SECRET via ?secret= or Authorization header
        const cronSecret = process.env.CRON_SECRET;
        const authHeader = req.headers.get("Authorization");
        const url = new URL(req.url);
        const searchSecret = url.searchParams.get("secret");

        const isAuthorized = cronSecret && (
            authHeader === `Bearer ${cronSecret}` || searchSecret === cronSecret
        );

        if (!isAuthorized) {
            return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        const supabase = await createClient();

        // Fetch up to 3 uncategorized sets per execution
        const { data: uncategorizedSets, error: fetchError } = await supabase
            .from("flashcard_sets")
            .select("id, topic, normalized_topic, category")
            .or('category.is.null,category.eq.Chưa phân loại')
            .limit(3);

        if (fetchError) {
            console.error("Backfill API: Fetch error:", fetchError.message);
            throw fetchError;
        }

        if (!uncategorizedSets || uncategorizedSets.length === 0) {
            return Response.json({ message: "No uncategorized sets found. All done!" });
        }

        const genAI = new GoogleGenAI({ apiKey, apiVersion: "v1beta" });

        const results: Array<{
            id: string;
            topic: string;
            category?: string;
            model?: string;
            status: string;
            error?: string;
        }> = [];

        for (let i = 0; i < uncategorizedSets.length; i++) {
            const set = uncategorizedSets[i];
            const topic = set.normalized_topic || set.topic;

            // 7s cooldown between records (skip for first)
            if (i > 0) {
                console.log(`Backfill API: Waiting 7s before processing "${topic}"...`);
                await sleep(7000);
            }

            const prompt = `Categorize this study topic into a short 1-2 word Vietnamese category label.
Examples: Công nghệ, Y tế, Lịch sử, Ngôn ngữ, Khoa học, Địa lý, Kinh doanh, Toán học.
Topic: "${topic}"
Return ONLY the category label. No punctuation, no markdown.`;

            // --- Model Rotation Logic ---
            let succeeded = false;
            let lastModelError: string = "";

            for (const modelName of FALLBACK_MODELS) {
                try {
                    console.log(`Backfill API: Trying model "${modelName}" for "${topic}"...`);

                    const result = await genAI.models.generateContent({
                        model: modelName,
                        contents: [{ role: "user", parts: [{ text: prompt }] }],
                    });

                    const rawText = (result as any).text ?? (result as any).candidates?.[0]?.content?.parts?.[0]?.text ?? "";
                    const cleanCategory = rawText.trim().replace(/[".]/g, "").substring(0, 50);

                    if (!cleanCategory) {
                        lastModelError = "Empty AI response";
                        continue; // try next model
                    }

                    // Persist to database
                    const { error: updateError } = await supabase
                        .from("flashcard_sets")
                        .update({ category: cleanCategory })
                        .eq("id", set.id);

                    if (updateError) throw updateError;

                    console.log(`Backfill API: ✅ "${topic}" -> "${cleanCategory}" (via ${modelName})`);
                    results.push({ id: set.id, topic, category: cleanCategory, model: modelName, status: "updated" });
                    succeeded = true;
                    break; // done — move to next record

                } catch (err: any) {
                    const is429 = err.status === 429
                        || String(err.message).includes("429")
                        || String(err.message).toLowerCase().includes("quota")
                        || String(err.message).toLowerCase().includes("resource exhausted");

                    if (is429) {
                        console.warn(`Backfill API: ⚠️ Model "${modelName}" hit Rate Limit (429). Rotating to next model in 2s...`);
                        lastModelError = `429 from ${modelName}`;
                        await sleep(2000); // Short pause before rotating
                        continue; // try next model
                    }

                    // Non-429 error — fail this record without rotating
                    lastModelError = err.message;
                    console.error(`Backfill API: ❌ Fatal error from "${modelName}": ${err.message}`);
                    break;
                }
            }

            if (!succeeded) {
                const allWere429 = lastModelError.includes("429");
                results.push({
                    id: set.id,
                    topic,
                    status: allWere429 ? "all_models_rate_limited" : "failed",
                    error: allWere429
                        ? "All models hit Rate Limit (429). Run again later."
                        : lastModelError,
                });

                // If all models are rate-limited, stop early to preserve quota
                if (allWere429) {
                    console.error("Backfill API: All fallback models exhausted. Stopping early.");
                    return Response.json({
                        message: `Stopped early — all models rate-limited. Processed ${results.length} sets.`,
                        results,
                    });
                }
            }
        }

        return Response.json({
            message: `Processed ${results.length} sets.`,
            results,
        });

    } catch (error: any) {
        console.error("Backfill API: Fatal Error:", error.message);
        return Response.json({ error: error.message }, { status: 500 });
    }
}
