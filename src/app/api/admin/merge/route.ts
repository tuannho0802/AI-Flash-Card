import { createClient } from "@/utils/supabase/server";
import { FlashcardSet, Flashcard } from "@/types/flashcard";

export async function POST(req: Request) {
    try {
        const supabase = await createClient();

        // Security Check
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

        const { data: profile } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .single();

        if (profile?.role !== 'admin') {
            return Response.json({ error: "Forbidden: Admin access required" }, { status: 403 });
        }

        // 1. Fetch all flashcard sets
        const { data: allSets, error: fetchError } = await supabase
            .from("flashcard_sets")
            .select("*")
            .order("created_at", { ascending: true });

        if (fetchError) throw fetchError;
        if (!allSets || allSets.length === 0) {
            return Response.json({ message: "No sets found to merge." });
        }


        // REVISED LOGIC: Let's find rows where normalized_topic is identical (case-insensitive)
        const normalizedGroups: Record<string, FlashcardSet[]> = {};
        allSets.forEach((set: any) => {
            const topicKey = (set.normalized_topic || set.topic || "Unknown").trim().toLowerCase();
            if (!normalizedGroups[topicKey]) normalizedGroups[topicKey] = [];
            normalizedGroups[topicKey].push(set);
        });

        let mergedCount = 0;
        const results = [];

        for (const [key, sets] of Object.entries(normalizedGroups)) {
            if (sets.length > 1) {
                // Merge needed
                const primarySet = sets[0]; // Oldest one
                const duplicates = sets.slice(1);

                let mergedCards: Flashcard[] = [...(primarySet.cards || [])];
                let mergedContributors: string[] = [...(primarySet.contributor_ids || [])];

                for (const duo of duplicates) {
                    // Combine cards
                    mergedCards = [...mergedCards, ...(duo.cards || [])];
                    // Combine contributors
                    if (duo.user_id) mergedContributors.push(duo.user_id);
                    if (duo.contributor_ids) {
                        mergedContributors = [...mergedContributors, ...duo.contributor_ids];
                    }
                }

                // Unique contributors
                mergedContributors = Array.from(new Set(mergedContributors.filter(id => !!id)));

                // Update primary
                const { error: updateError } = await supabase
                    .from("flashcard_sets")
                    .update({
                        cards: mergedCards,
                        contributor_ids: mergedContributors,
                        // Update normalized_topic to match the key (Title Case version of first one)
                        normalized_topic: primarySet.normalized_topic
                    })
                    .eq("id", primarySet.id);

                if (updateError) {
                    results.push({ topic: key, status: "error", error: updateError.message });
                    continue;
                }

                // Delete duplicates
                const duplicateIds = duplicates.map(d => d.id);
                const { error: deleteError } = await supabase
                    .from("flashcard_sets")
                    .delete()
                    .in("id", duplicateIds);

                if (deleteError) {
                    results.push({ topic: key, status: "partial", message: "Merged but failed to delete duplicates", error: deleteError.message });
                } else {
                    mergedCount++;
                    results.push({ topic: key, status: "success", merged: sets.length });
                }
            }
        }

        return Response.json({
            message: `Successfully processed merges for ${mergedCount} topics.`,
            details: results
        });

    } catch (error: any) {
        console.error("Merge error:", error);
        return Response.json({ error: error.message }, { status: 500 });
    }
}
