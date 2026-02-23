import { GoogleGenAI } from "@google/genai";
import { Flashcard } from "@/types/flashcard";
import { createClient } from "@/utils/supabase/server";

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
        const { topic, count = 5, userId } = body;

        // Security Check: CRON_SECRET for automated jobs or valid userId (optional refinement)
        const cronSecret = process.env.CRON_SECRET;
        const authHeader = req.headers.get("Authorization");
        const isCron = cronSecret && authHeader === `Bearer ${cronSecret}`;

        if (!topic) {
            return Response.json({ error: "Topic is required" }, { status: 400 });
        }

        const genAI = new GoogleGenAI({ apiKey, apiVersion: 'v1beta' });
        const models = ['gemini-3-flash-preview', 'gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemma-3-27b-it'];

        const prompt = `Your task is a two-step educational process for the topic: "${topic}".
        
        Step 1: Normalize the topic name into a standard database key.
        - Rules: English, Title Case (e.g., "Python Programming").
        - Programming: Use "[Language] Programming" (e.g., "học python" -> "Python Programming").
        - Subject Mapping: JS/Javascript -> "JavaScript Programming", Py/Python -> "Python Programming", React -> "React Framework".
        - Focus: Core subject only, ignore filler words like "học", "cơ bản", "basics".

        Step 2: Generate ${count} high-quality educational flashcards for this topic.
        - Language: Vietnamese.
        - Structure: Question/Term on the front, Answer/Definition on the back.

        Return ONLY a raw JSON object with this exact structure:
        {
          "normalized_topic": "Consolidated Title",
          "flashcards": [{"front": "...", "back": "..."}]
        }
        
        Do not include markdown headers, backticks, or any other text.`;

        console.log(`Generate API: Streaming Conversion for: ${topic}`);

        let lastError: any = null;

        for (const modelName of models) {
            try {
                console.log(`Generate API: Trying Streaming with model ${modelName} via v1beta...`);

                // Initial stream setup
                const result = await genAI.models.generateContentStream({
                    model: modelName,
                    contents: [{
                        // @ts-ignore
                        role: 'user',
                        parts: [{ text: prompt }]
                    }],
                });

                // If we get here, the request was accepted (pre-stream start success)
                console.log(`Generate API: Model ${modelName} stream started!`);

                const encoder = new TextEncoder();
                const stream = new ReadableStream({
                    async start(controller) {
                        let fullResponse = "";
                        try {
                            // In @google/genai (GA SDK), generateContentStream result is an AsyncGenerator
                            for await (const chunk of result) {
                                const chunkText = chunk.text;
                                if (chunkText) {
                                    fullResponse += chunkText;
                                    controller.enqueue(encoder.encode(chunkText));
                                }
                            }
                            controller.close();

                            // Non-blocking Background Persistence
                            (async () => {
                                try {
                                    const data = JSON.parse(fullResponse);
                                    if (data.flashcards && data.normalized_topic) {
                                        await saveToDatabase(data, body.userId, topic);
                                    }
                                } catch (err) {
                                    console.error("Generate API: Background Save - Parsing/Saving failed:", err);
                                }
                            })();

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
                        "x-no-compression": "1", // Hint for some proxies
                    },
                });

            } catch (err: any) {
                lastError = err;
                const status = err.status || err.code;
                console.warn(`Generate API: Model ${modelName} failed to start stream (Status: ${status})`);

                // Fallback on 429 (Rate limit), 503 (Overload), or 404 (Not Found)
                if (status === 429 || status === 503 || status === 404 || err.message?.includes("429") || err.message?.includes("Quota")) {
                    console.log(`Generate API: Falling back from ${modelName}...`);
                    continue;
                } else {
                    // Fatal error for this request
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

async function saveToDatabase(data: any, userId: string | undefined, originalTopic: string) {
    try {
        const supabase = await createClient();
        const { normalized_topic, flashcards } = data;
        const normLower = normalized_topic.toLowerCase().trim();

        console.log(`Generate API: Background Save - Processing "${normalized_topic}"...`);

        // 1. Search for existing set by normalized_topic OR original topic in aliases
        const { data: existingSets, error: searchError } = await supabase
            .from("flashcard_sets")
            .select("*")
            .or(`normalized_topic.ilike.${normLower},aliases.cs.{"${originalTopic}"},topic.ilike.${originalTopic}`);

        if (searchError) throw searchError;

        if (existingSets && existingSets.length > 0) {
            // Smart Merge Logic
            const primarySet = existingSets[0];
            console.log(`Generate API: Background Save - Found existing set (ID: ${primarySet.id}). Merging...`);

            // Deduplicate cards by front content (case-insensitive)
            const cardsMap = new Map();
            (primarySet.cards || []).forEach((c: Flashcard) => cardsMap.set(c.front.toLowerCase().trim(), c));
            (flashcards || []).forEach((c: Flashcard) => {
                const key = c.front.toLowerCase().trim();
                if (!cardsMap.has(key)) cardsMap.set(key, c);
            });
            const mergedCards = Array.from(cardsMap.values());

            // Merge contributor IDs
            const contributors = new Set(primarySet.contributor_ids || []);
            if (userId) contributors.add(userId);
            if (primarySet.user_id) contributors.add(primarySet.user_id);

            // Merge aliases
            const aliases = new Set(primarySet.aliases || []);
            aliases.add(originalTopic);
            if (primarySet.topic) aliases.add(primarySet.topic);

            const { error: updateError } = await supabase
                .from("flashcard_sets")
                .update({
                    cards: mergedCards,
                    contributor_ids: Array.from(contributors).filter(Boolean),
                    aliases: Array.from(aliases).filter(Boolean),
                    updated_at: new Date().toISOString()
                })
                .eq("id", primarySet.id);

            if (updateError) throw updateError;
            console.log(`Generate API: Background Save - Successfully merged into ID: ${primarySet.id}`);
        } else {
            // New entry
            console.log(`Generate API: Background Save - Creating new set for "${normalized_topic}".`);
            const { error: insertError } = await supabase
                .from("flashcard_sets")
                .insert({
                    topic: originalTopic,
                    normalized_topic: normalized_topic,
                    cards: flashcards,
                    user_id: userId || null,
                    contributor_ids: userId ? [userId] : [],
                    aliases: [originalTopic]
                });

            if (insertError) throw insertError;
            console.log(`Generate API: Background Save - Successfully created new set.`);
        }
    } catch (err: any) {
        console.error("Generate API: Background Save - DB Operation Failed:", err.message);
    }
}
