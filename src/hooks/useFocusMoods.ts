"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { MoodConfig, FALLBACK_MOODS, SPECIAL_MOODS } from "@/utils/musicConfig";

export function useFocusMoods() {
    const [moods, setMoods] = useState<MoodConfig[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchMoods() {
            try {
                setLoading(true);
                const { data, error: sbError } = await supabase
                    .from("focus_modes")
                    .select("*")
                    .eq("is_active", true) // Only load active modes
                    .order("order_index", { ascending: true }); // Real column name: order_index

                if (sbError) throw sbError;

                if (data && data.length > 0) {
                    const dbMoods: MoodConfig[] = data.map((m: any) => ({
                        id: m.id || m.title, // Use UUID from DB
                        icon: m.icon_name || "Music",
                        label: m.title,       // Real column name: title
                        urls: m.youtube_id || [],   // Real column name: youtube_id (singular)
                        type: "youtube_video",
                    }));
                    setMoods([...dbMoods, ...SPECIAL_MOODS]);
                } else {
                    // Empty data still gets fallbacks
                    setMoods([...FALLBACK_MOODS, ...SPECIAL_MOODS]);
                }
            } catch (err: any) {
                console.error("Supabase Error:", err.message, err.details || err);
                setError(err.message || "Unknown error fetching focus modes");
                setMoods([...FALLBACK_MOODS, ...SPECIAL_MOODS]);
            } finally {
                setLoading(false);
            }
        }

        fetchMoods();

        // Subscribe to real-time changes
        const channel = supabase
            .channel("focus_modes_changes")
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "focus_modes" },
                () => fetchMoods()
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    return { moods, loading, error };
}
