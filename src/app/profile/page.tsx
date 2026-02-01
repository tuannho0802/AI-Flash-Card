"use client";
import {
  useEffect,
  useState,
  useCallback,
} from "react";
import { createClient } from "@/utils/supabase/client";
import { User } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import AvatarUpload from "@/components/AvatarUpload";
import { FlashcardSet } from "@/types/flashcard";
import {
  Loader2,
  BookOpen,
  Calendar,
  Clock,
} from "lucide-react";
import Link from "next/link";

export default function Profile() {
  const [user, setUser] = useState<User | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [sets, setSets] = useState<
    FlashcardSet[]
  >([]);
  const [stats, setStats] = useState({
    totalSets: 0,
    totalCards: 0,
  });
  const supabase = createClient();
  const router = useRouter();

  const getProfile = useCallback(async () => {
    try {
      setLoading(true);
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error || !user) {
        router.push("/login");
        return;
      }

      setUser(user);

      // Fetch Stats & History
      const { data: userSets } = await supabase
        .from("flashcard_sets")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", {
          ascending: false,
        });

      if (userSets) {
        const setsTyped =
          userSets as FlashcardSet[];
        setSets(setsTyped);

        const totalCards = setsTyped.reduce(
          (acc, set) => {
            return (
              acc +
              (Array.isArray(set.cards)
                ? set.cards.length
                : 0)
            );
          },
          0,
        );

        setStats({
          totalSets: setsTyped.length,
          totalCards,
        });
      }
    } catch (error) {
      console.log(
        "Error loading profile:",
        error,
      );
    } finally {
      setLoading(false);
    }
  }, [router, supabase]);

  useEffect(() => {
    getProfile();
  }, [getProfile]);

  const handleAvatarUpload = async (
    url: string,
  ) => {
    try {
      const { error } =
        await supabase.auth.updateUser({
          data: { avatar_url: url }, // We might need to construct the full URL if it's just the path
        });
      if (error) throw error;
      // Reload profile to show new avatar
      getProfile();
    } catch (error) {
      console.log(
        "Error updating avatar:",
        error,
      );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="max-w-4xl mx-auto py-8 space-y-8">
      {/* Profile Header */}
      <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 flex flex-col md:flex-row items-center gap-8">
        <div className="shrink-0">
          <AvatarUpload
            uid={user.id}
            url={user.user_metadata.avatar_url}
            size={120}
            onUpload={handleAvatarUpload}
          />
        </div>

        <div className="flex-1 text-center md:text-left space-y-2">
          <h1 className="text-3xl font-bold text-gray-900">
            {user.user_metadata.full_name ||
              "User"}
          </h1>
          <p className="text-gray-500">
            {user.email}
          </p>
          <div className="flex flex-wrap gap-4 justify-center md:justify-start mt-4">
            <div className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-full text-sm font-medium">
              <BookOpen size={16} />
              {stats.totalSets} Sets
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-pink-50 text-pink-700 rounded-full text-sm font-medium">
              <BookOpen size={16} />
              {stats.totalCards} Cards
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-purple-50 text-purple-700 rounded-full text-sm font-medium">
              <Calendar size={16} />
              Joined{" "}
              {new Date(
                user.created_at,
              ).toLocaleDateString()}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Your Flashcard Sets
        </h2>

        {sets.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
            <p className="text-gray-500">
              You haven&apos;t created any
              flashcard sets yet.
            </p>
            <Link
              href="/"
              className="inline-block mt-4 px-6 py-2 bg-black text-white rounded-lg font-medium hover:bg-gray-800 transition-colors"
            >
              Create your first set
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sets.map((set) => (
              <div
                key={set.id}
                className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
              >
                <h3 className="font-semibold text-lg text-gray-900 mb-2 truncate">
                  {set.topic}
                </h3>
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <span>
                    {Array.isArray(set.cards)
                      ? set.cards.length
                      : 0}{" "}
                    cards
                  </span>
                  <span>
                    {set.created_at
                      ? new Date(
                          set.created_at,
                        ).toLocaleDateString()
                      : "N/A"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
