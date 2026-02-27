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
        const { topic, count = 5, userId, category: userCategory } = body;

        // Security Check: CRON_SECRET for automated jobs or valid userId (optional refinement)
        const cronSecret = process.env.CRON_SECRET;
        const authHeader = req.headers.get("Authorization");
        const isCron = cronSecret && authHeader === `Bearer ${cronSecret}`;

        if (!topic) {
            return Response.json({ error: "Topic is required" }, { status: 400 });
        }

        const genAI = new GoogleGenAI({ apiKey, apiVersion: 'v1beta' });
        const models = ['gemini-3-flash-preview', 'gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemma-3-27b-it'];

        const categoryInstruction = userCategory
            ? `- Use "${userCategory}" as the category (user-provided).`
            : `- Assign a 1-2 word Vietnamese category (e.g., Công nghệ, Y tế, Lịch sử, Ngôn ngữ, Khoa học, Kinh doanh, Toán học).`;

        const prompt = `Your task is a two-step educational process for the topic: "${topic}".
        
        Step 1: Normalize the topic name into a standard database key.
        - Rules: English, Title Case (e.g., "Python Programming").
        - Programming: Use "[Language] Programming" (e.g., "học python" -> "Python Programming").
        - Subject Mapping: JS/Javascript -> "JavaScript Programming", Py/Python -> "Python Programming", React -> "React Framework".
        - Focus: Core subject only, ignore filler words like "học", "cơ bản", "basics".

        Step 2: Categorize this topic.
        ${categoryInstruction}

        Step 3: Generate ${count} high-quality educational flashcards for this topic.
        - Language: Vietnamese.
        - Structure: Question/Term on the front, Answer/Definition on the back.

        Return ONLY a raw JSON object with this exact structure:
        {
          "normalized_topic": "Consolidated Title",
          "category": "Category Label",
          "flashcards": [{"front": "...", "back": "..."}]
        }
        
        Do not include markdown headers, backticks, or any other text.`;

        console.log(`Generate API: Streaming Conversion for: ${topic}`);

        let lastError: any = null;

        for (const modelName of models) {
            try {
                if (isCron) {
                    // NON-STREAMING FLOW for Cron to ensure persistence
                    console.log(`Generate API: Cron detected. Using non-streaming flow with model ${modelName}.`);
                    const result = await genAI.models.generateContent({
                        model: modelName,
                        contents: [{
                            // @ts-ignore
                            role: 'user',
                            parts: [{ text: prompt }]
                        }],
                    });

                    // The result usually contains a 'text' property or requires response.text() depending on the SDK method used
                    // For genAI.models.generateContent (v1beta direct), it usually returns a GenerateContentResponse
                    const responseText = (result as any).text || (result as any).response?.text?.() || "";

                    const data = JSON.parse(responseText);
                    if (data.flashcards && data.normalized_topic) {
                        const finalCategory = userCategory || data.category || null;
                        // AWAIT the save to ensure it completes before connection closes
                        await saveToDatabase(data, userId as string | undefined, topic as string, finalCategory);
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

                            // Non-blocking Background Persistence for UI users
                            (async () => {
                                try {
                                    const data = JSON.parse(fullResponse);
                                    if (data.flashcards && data.normalized_topic) {
                                        const finalCategory = userCategory || data.category || null;
                                        await saveToDatabase(data, userId, topic, finalCategory);
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
                        "x-no-compression": "1",
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

const ICONS = ["Tag", "Code", "Brain", "Heart", "Globe", "Microscope", "BookOpen", "Cpu", "Briefcase", "Music", "Languages", "Calculator", "Palette", "TrendingUp", "Zap"];
const COLORS = ["blue", "emerald", "amber", "purple", "cyan", "rose", "pink", "orange", "indigo", "slate"];

async function resolveCategoryId(supabase: any, categoryName: string | null): Promise<{ id: string, name: string } | null> {
    if (!categoryName || categoryName.trim() === '') return null;

    const rawCat = categoryName.trim();
    const normalizedCat = normalizeString(rawCat);
    const translatedName = CATEGORY_TRANSLATIONS[normalizedCat] || rawCat;
    let slug = generateSlug(translatedName);

    // Handing special cases to map to default
    if (slug === 'khac' || slug === 'chua-phan-loai') {
        slug = 'chua-phan-loai';
    }

    // Attempt to lookup
    const { data: existingCat, error: lookupErr } = await supabase
        .from('categories')
        .select('id, name')
        .eq('slug', slug)
        .single();

    if (existingCat?.id) {
        return { id: existingCat.id, name: existingCat.name };
    }

    if (lookupErr && lookupErr.code !== 'PGRST116') { // PGRST116 is "No rows found"
        console.error("Resolve Category lookup error:", lookupErr);
    }

    // Insert new category
    const bestIcon = getBestIcon(translatedName);
    const randomColor = COLORS[Math.floor(Math.random() * COLORS.length)];

    // Use translatedName if we are creating new
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
        // Maybe someone else created it concurrently, try reading once more
        const { data: retryCat } = await supabase.from('categories').select('id, name').eq('slug', slug).single();
        return retryCat ? { id: retryCat.id, name: retryCat.name } : null;
    }

    console.log(`Generate API: Auto-created new category: "${finalName}"`);
    return { id: (newCat as any).id, name: finalName };
}

async function saveToDatabase(data: any, userId: string | undefined, originalTopic: string, category?: string | null) {
    try {
        const supabase = await createClient();
        const { normalized_topic, flashcards } = data;
        const normLower = normalized_topic.toLowerCase().trim();

        console.log(`Generate API: Background Save - Processing "${normalized_topic}"...`);

        // Resolve Category ID and Canonical Name
        const finalCategoryText = category || "Chưa phân loại";
        const catInfo = await resolveCategoryId(supabase, finalCategoryText);
        const categoryId = catInfo?.id || null;
        const canonicalCategoryName = catInfo?.name || finalCategoryText;

        // 1. Search for existing set by normalized_topic OR original topic in aliases
        const { data: existingSets, error: searchError } = await supabase
            .from("flashcard_sets")
            .select("*")
            .or(`normalized_topic.ilike.${normLower},aliases.cs.{"${originalTopic}"},topic.ilike.${originalTopic}`);

        if (searchError) {
            console.error("Generate API: Search query failed:", searchError);
            throw searchError;
        }

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

            const updatePayload: Record<string, any> = {
                cards: mergedCards,
                contributor_ids: Array.from(contributors).filter(Boolean),
                aliases: Array.from(aliases).filter(Boolean),
                updated_at: new Date().toISOString()
            };

            // Overwrite category string and link id if a new one is provided
            if (category) {
                updatePayload.category = canonicalCategoryName;
                updatePayload.category_id = categoryId;
            } else if (!primarySet.category_id && categoryId) {
                // If it was previously unlinked, link it now
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
                    aliases: [originalTopic],
                    category: canonicalCategoryName,
                    category_id: categoryId
                });

            if (insertError) {
                console.error("Generate API: Insert failed:", insertError);
                throw insertError;
            }
            console.log(`Generate API: Background Save - Successfully created new set.`);
        }
    } catch (err: any) {
        console.error("Generate API: saveToDatabase Error:", err.message);
        throw err; // Re-throw to allow parent to handle
    }
}
