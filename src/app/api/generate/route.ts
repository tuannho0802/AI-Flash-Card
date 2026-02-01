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

        // Initialize Gemini with v1beta to access 'gemini-flash-latest'
        const genAI = new GoogleGenAI({ apiKey, apiVersion: 'v1beta' });

        // Prompt engineering: Explicitly request raw JSON and define structure
        const prompt = `Create 5 educational flashcards about the topic: "${topic}". 
        Language: Vietnamese.
        Return ONLY a raw JSON array. 
        Do not include markdown formatting (like \`\`\`json).
        Do not include any introductory or concluding text.
        Structure: [{"front": "Question/Term", "back": "Answer/Definition"}]`;

        // Attempt to use 'gemini-flash-latest' which often points to the stable Flash model.
        // This is an attempt to bypass the 2.0 rate limits if 2.0-flash is exhausted.
        const result = await genAI.models.generateContent({
            model: 'gemini-flash-latest',
            contents: [{
                role: 'user',
                parts: [{ text: prompt }]
            }],
        });

        console.log("Model used: gemini-flash-latest");
        const text = result.text;

        console.log("Gemini API Response Text:", text);

        if (!text) {
            throw new Error("Empty response from AI");
        }

        // Manual JSON Parsing with Robust Cleanup
        let data;
        try {
            // Remove markdown code blocks if any
            const cleanText = text.replace(/```json|```/g, "").trim();

            // Find JSON array bounds
            const jsonStart = cleanText.indexOf('[');
            const jsonEnd = cleanText.lastIndexOf(']') + 1;

            if (jsonStart === -1 || jsonEnd === 0) {
                throw new Error("No JSON array found in response");
            }

            const jsonBody = cleanText.slice(jsonStart, jsonEnd);
            data = JSON.parse(jsonBody);

            if (!Array.isArray(data)) {
                throw new Error("Parsed data is not an array");
            }
        } catch (parseError) {
            console.error("Manual Parsing Error:", parseError);
            throw new Error(`Failed to parse AI response: ${(parseError as Error).message}`);
        }

        return Response.json(data);

    } catch (error: unknown) {
        console.error("API Error Full Object:", JSON.stringify(error, null, 2));

        const errorMessage = error instanceof Error ? error.message : "Internal Server Error";
        let status = 500;
        let errorResponse: Record<string, unknown> = { error: errorMessage };

        // Handle specific error types
        if (typeof error === 'object' && error !== null) {
            const errObj = error as Record<string, unknown>;

            // Check for Rate Limit (429)
            // The SDK might return 429 in various ways (status, code, or within error object)
            if (
                errObj.status === 429 ||
                errObj.code === 429 ||
                (errObj.error && (errObj.error as Record<string, unknown>).code === 429) ||
                errorMessage.includes("429") ||
                errorMessage.includes("Quota exceeded")
            ) {
                status = 429;
                errorResponse = {
                    error: "rate_limit",
                    message: "Hệ thống đang bận hoặc hết hạn mức. Vui lòng thử lại sau.",
                    retryAfter: 30
                };
            }
            // Check for Not Found (404)
            else if (
                errObj.status === 404 ||
                errObj.code === 404 ||
                errorMessage.includes("404") ||
                errorMessage.includes("not found")
            ) {
                status = 404;
                errorResponse = {
                    error: "model_not_found",
                    message: "Model không khả dụng hoặc sai phiên bản API.",
                    details: errorMessage
                };
            }
        }

        return Response.json(errorResponse, { status });
    }
}
