import { createClient } from "@/utils/supabase/server";

export const runtime = "edge";

export async function POST(req: Request) {
    try {
        const supabase = await createClient();

        // Admin Check
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
        }

        const { data: profile } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .single();

        if (profile?.role !== "admin") {
            return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 });
        }

        const { setId, cardFront } = await req.json();

        if (!setId || !cardFront) {
            return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400 });
        }

        // Fetch current set
        const { data: set, error: fetchErr } = await supabase
            .from("flashcard_sets")
            .select("cards")
            .eq("id", setId)
            .single();

        if (fetchErr || !set) {
            return new Response(JSON.stringify({ error: "Set not found" }), { status: 404 });
        }

        // Filter out the card
        const updatedCards = (set.cards as any[]).filter(c => c.front !== cardFront);

        // Update DB
        const { error: updateErr } = await supabase
            .from("flashcard_sets")
            .update({ cards: updatedCards })
            .eq("id", setId);

        if (updateErr) {
            return new Response(JSON.stringify({ error: updateErr.message }), { status: 500 });
        }

        return new Response(JSON.stringify({ success: true, removed: cardFront }), { status: 200 });

    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
}
