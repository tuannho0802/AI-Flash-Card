import { GoogleGenAI } from "@google/genai";
import { Flashcard } from "@/types/flashcard";

export const runtime = "edge"; // Streaming works best in Edge runtime

export async function POST(req: Request) {
    try {
        const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;

        if (!apiKey) {
            console.error("Generate API: API Key is missing");
            return Response.json({ error: "API Key is missing" }, { status: 500 });
        }

        const body = await req.json();
        const { topic, count = 5 } = body;

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
                        try {
                            // In @google/genai (GA SDK), result is directly an AsyncGenerator
                            for await (const chunk of result) {
                                // chunk is EnhancedGenerateContentResponse
                                const chunkText = chunk.text;
                                if (chunkText) {
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
                        "Content-Type": "text/plain; charset=utf-8",
                        "Transfer-Encoding": "chunked",
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
