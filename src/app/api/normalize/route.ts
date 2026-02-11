import { GoogleGenAI } from "@google/genai";

export async function POST(req: Request) {
    try {
        const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;

        if (!apiKey) {
            return Response.json({ error: "API Key is missing" }, { status: 500 });
        }

        const body = await req.json();
        const { topic } = body;

        if (!topic) {
            return Response.json({ error: "Topic is required" }, { status: 400 });
        }

        // Initialize Gemini
        const genAI = new GoogleGenAI({ apiKey, apiVersion: 'v1beta' });

        const prompt = `Normalize the following study topic for a database key.
        Rules:
        1. Language: English.
        2. Format: Title Case (e.g., "Python Basics").
        3. Length: 2-4 words.
        4. Be concise but descriptive.
        5. Return ONLY the normalized string, no extra text, no quotes.

        Topic: "${topic}"`;

        const result = await genAI.models.generateContent({
            model: 'gemini-flash-latest',
            contents: [{
                role: 'user',
                parts: [{ text: prompt }]
            }],
        });

        const normalizedTopic = result.text?.trim();

        if (!normalizedTopic) {
            throw new Error("Empty response from AI");
        }

        return Response.json({ normalizedTopic });

    } catch (error: unknown) {
        console.error("Normalization API Error:", error);
        const errorMessage = error instanceof Error ? error.message : "Internal Server Error";
        return Response.json({ error: errorMessage }, { status: 500 });
    }
}
