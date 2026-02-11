// DISABLED: This route is consolidated into /api/generate for performance and cost optimization.
export async function POST() {
    return Response.json({
        error: "This endpoint is disabled. Use /api/generate which now handles normalization and generation in one request.",
        status: "deprecated"
    }, { status: 410 });
}

/* 
// Original realization logic preserved for reference:
import { GoogleGenAI } from "@google/genai";

export async function POST(req: Request) {
    try {
        const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
        if (!apiKey) return Response.json({ error: "API Key is missing" }, { status: 500 });

        const body = await req.json();
        const { topic } = body;
        if (!topic) return Response.json({ error: "Topic is required" }, { status: 400 });

        const genAI = new GoogleGenAI({ apiKey, apiVersion: 'v1beta' });
        const result = await genAI.models.generateContent({
            model: 'gemini-flash-latest',
            contents: [{ role: 'user', parts: [{ text: "Normalize..." }] }]
        });
        // ... (etc)
    } catch (e) {
        return Response.json({ error: "Error" }, { status: 500 });
    }
}
*/
