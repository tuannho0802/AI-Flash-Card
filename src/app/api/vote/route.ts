import { createClient } from "@/utils/supabase/server";

export const runtime = "edge";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();

    // Auth Check
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    const { setId, cardIndex, rating } = await req.json();

    if (!setId || cardIndex === undefined || !rating) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400 });
    }

    // Upsert vote
    const { error: upsertErr } = await supabase
      .from("flashcard_votes")
      .upsert({
        user_id: user.id,
        set_id: setId,
        card_index: cardIndex,
        rating: rating,
      }, {
        onConflict: 'user_id,set_id,card_index'
      });

    if (upsertErr) {
      return new Response(JSON.stringify({ error: upsertErr.message }), { status: 500 });
    }

    // Fetch updated stats
    const { data: stats, error: statsErr } = await supabase
      .from("flashcard_difficulty_stats")
      .select("*")
      .eq("set_id", setId)
      .eq("card_index", cardIndex)
      .single();

    if (statsErr && statsErr.code !== 'PGRST116') { // PGRST116 is "No rows found"
      return new Response(JSON.stringify({ error: statsErr.message }), { status: 500 });
    }

    return new Response(JSON.stringify({ 
      success: true, 
      stats: stats || {
        avg_rating: rating,
        total_votes: 1,
        easy_count: rating === 1 ? 1 : 0,
        medium_count: rating === 2 ? 1 : 0,
        hard_count: rating === 3 ? 1 : 0
      }
    }), { status: 200 });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
