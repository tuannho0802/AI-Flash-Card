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

        const adminEmail = process.env.ADMIN_EMAIL;
        if (profile?.role !== 'admin' || user.email !== adminEmail) {
            return Response.json({ error: "Forbidden: Admin access required" }, { status: 403 });
        }

        // 1. Fetch ALL flashcard sets
        const { data: allSets, error: fetchError } = await supabase
            .from("flashcard_sets")
            .select("*")
            .order("created_at", { ascending: true });

        if (fetchError) throw fetchError;
        if (!allSets || allSets.length === 0) {
            return Response.json({ message: "No sets found to merge." });
        }

        // 2. Group by normalized_topic in JavaScript
        console.log(`Admin Merge: Total sets fetched: ${allSets.length}`);
        const groups: Record<string, FlashcardSet[]> = {};
        allSets.forEach((set: FlashcardSet) => {
            const rawTopic = (set.topic || "Unknown").trim();
            const rawNorm = (set.normalized_topic || "").trim();

            // Aggressive normalization for the key
            const topicKey = (rawNorm || rawTopic).toLowerCase();

            console.log(`- Set ID: ${set.id}, Topic: "${rawTopic}", Norm: "${rawNorm}", Key: "${topicKey}"`);

            if (!groups[topicKey]) {
                groups[topicKey] = [];
            }
            groups[topicKey].push(set);
        });

        console.log('Groups found keys:', Object.keys(groups));

        let mergedTopicsCount = 0;
        const mergeDetails = [];

        // 3. Perform Merging
        for (const [key, sets] of Object.entries(groups)) {
            if (sets.length > 1) {
                const primarySet = sets[0]; // Oldest record
                const duplicates = sets.slice(1);
                const duplicateIds = duplicates.map(d => d.id);

                console.log(`Groups found: Group '${key}' has ${sets.length} sets. Merging into ID ${primarySet.id}...`);

                // 1. Combine and deduplicate cards by 'front' content
                const cardsMap = new Map<string, Flashcard>();
                sets.forEach(s => {
                    (s.cards || []).forEach((c: Flashcard) => {
                        const cardKey = c.front.trim().toLowerCase();
                        if (!cardsMap.has(cardKey)) {
                            cardsMap.set(cardKey, c);
                        }
                    });
                });
                const mergedCards = Array.from(cardsMap.values());

                // 2. Combine contributor IDs
                const contributorIds = new Set<string>();
                sets.forEach(s => {
                    if (s.user_id) contributorIds.add(s.user_id);
                    if (s.contributor_ids) {
                        s.contributor_ids.forEach(id => contributorIds.add(id));
                    }
                });
                const uniqueContributors = Array.from(contributorIds).filter(id => !!id);

                // 3. Aggregate aliases (old topics)
                const aliasesSet = new Set<string>(primarySet.aliases || []);
                sets.forEach(s => {
                    if (s.topic && s.topic.toLowerCase() !== key) {
                        aliasesSet.add(s.topic);
                    }
                });
                const finalAliases = Array.from(aliasesSet);

                // 4. Update the primary record
                const { error: updateError } = await supabase
                    .from("flashcard_sets")
                    .update({
                        cards: mergedCards,
                        contributor_ids: uniqueContributors,
                        aliases: finalAliases,
                        normalized_topic: primarySet.normalized_topic || primarySet.topic 
                    })
                    .eq("id", primarySet.id);

                if (updateError) {
                    console.error(`Merge update failed for ${key}:`, updateError);
                    mergeDetails.push({ topic: key, status: "error", error: updateError.message });
                    continue;
                }

                // 5. Delete redundant records
                console.log(`- Attempting to delete duplicate IDs: ${JSON.stringify(duplicateIds)}`);
                const { error: deleteError } = await supabase
                    .from("flashcard_sets")
                    .delete()
                    .in("id", duplicateIds);

                if (deleteError) {
                    console.error(`- Merge delete failed for ${key}:`, deleteError);
                    mergeDetails.push({ topic: key, status: "partial", message: "Merged primary but failed to delete duplicates", error: deleteError.message });
                } else {
                    console.log(`- Successfully deleted duplicates for ${key}`);
                    mergedTopicsCount++;
                    mergeDetails.push({
                        topic: key,
                        status: "success",
                        mergedCount: sets.length,
                        totalCards: mergedCards.length,
                        aliases: finalAliases
                    });
                }
            }
        }

        return Response.json({
            message: `Successfully merged duplicates for ${mergedTopicsCount} topics.`,
            details: mergeDetails,
            groupsFound: Object.keys(groups).length
        });

    } catch (error: any) {
        console.error("Merge fatal error:", error);
        return Response.json({ error: error.message }, { status: 500 });
    }
}
