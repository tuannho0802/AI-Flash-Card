import { GoogleGenAI } from "@google/genai";
import { createClient } from "@/utils/supabase/server";
import { Flashcard } from "@/types/flashcard";

export async function POST(req: Request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        const userId = user?.id || null;

        const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;

        if (!apiKey) {
            console.error("Generate API: API Key is missing");
            return Response.json({ error: "API Key is missing" }, { status: 500 });
        }

        const body = await req.json();
        const { topic, count = 5, skipDb = false } = body;

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

        console.log(`Generate API: Generating & Normalizing for: ${topic}`);

        let text = "";
        let usedModel = "";
        let lastError: any = null;

        for (const modelName of models) {
            try {
                console.log(`Generate API: Trying model ${modelName} via v1beta...`);

                const result = await genAI.models.generateContent({
                    model: modelName,
                    contents: [{
                        // @ts-ignore
                        role: 'user',
                        parts: [{ text: prompt }]
                    }],
                });

                // In @google/genai (GA), we use result.text or response.text()
                if (typeof result.text === 'string') {
                    text = result.text;
                } else if ((result as any).response?.text) {
                    text = (result as any).response.text();
                }

                if (text) {
                    usedModel = modelName;
                    console.log(`Generate API: Model ${modelName} succeeded!`);
                    break;
                }
            } catch (err: any) {
                lastError = err;
                const status = err.status || err.code;
                console.warn(`Generate API: Model ${modelName} failed with status ${status}`);

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

        if (!text) {
            throw lastError || new Error("All models failed to return a response.");
        }

        // Robust JSON Parsing
        let parsedData;
        try {
            const cleanText = text.replace(/```json|```/g, "").trim();
            const jsonStart = cleanText.indexOf('{');
            const jsonEnd = cleanText.lastIndexOf('}') + 1;
            parsedData = JSON.parse(cleanText.slice(jsonStart, jsonEnd));
        } catch (e) {
            console.error(`Generate API: AI Response Parsing Failed (Model: ${usedModel}):`, text);
            throw new Error(`Failed to parse AI response from ${usedModel}.`);
        }

        const { normalized_topic, flashcards } = parsedData;

        if (!normalized_topic || !Array.isArray(flashcards)) {
            throw new Error("Invalid structure from AI response.");
        }

        if (skipDb) {
            return Response.json({ normalized_topic, flashcards });
        }

        // Database Persistence
        console.log(`Generate API: Checking for existing set '${normalized_topic}'...`);

        const { data: existingSet } = await supabase
            .from("flashcard_sets")
            .select("*")
            .ilike("normalized_topic", normalized_topic)
            .limit(1)
            .maybeSingle();

        let finalResultId = null;

        if (existingSet) {
            console.log(`Generate API: Merging into existing set ID: ${existingSet.id}`);

            const cardsMap = new Map<string, Flashcard>();
            (existingSet.cards || []).forEach((c: Flashcard) => {
                cardsMap.set(c.front.trim().toLowerCase(), c);
            });
            flashcards.forEach((c: Flashcard) => {
                const key = c.front.trim().toLowerCase();
                if (!cardsMap.has(key)) cardsMap.set(key, c);
            });
            const mergedCards = Array.from(cardsMap.values());

            const contributors = new Set(existingSet.contributor_ids || []);
            if (userId) contributors.add(userId);

            const aliases = new Set(existingSet.aliases || []);
            aliases.add(topic.trim());

            const { error: updateError } = await supabase
                .from("flashcard_sets")
                .update({
                    cards: mergedCards,
                    contributor_ids: Array.from(contributors),
                    aliases: Array.from(aliases)
                })
                .eq("id", existingSet.id);

            if (updateError) console.error("Update error:", updateError);
            finalResultId = existingSet.id;
        } else {
            console.log(`Generate API: Creating new set for: ${normalized_topic}`);

            const { data: newSet, error: insertError } = await supabase
                .from("flashcard_sets")
                .insert([{
                    topic: topic,
                    normalized_topic: normalized_topic,
                    cards: flashcards,
                    contributor_ids: userId ? [userId] : [],
                    aliases: [topic.trim()]
                }])
                .select("id")
                .single();

            if (insertError) console.error("Insert error:", insertError);
            if (newSet) finalResultId = newSet.id;
        }

        return Response.json({
            normalized_topic,
            flashcards,
            id: finalResultId
        });

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
