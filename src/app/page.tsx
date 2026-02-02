"use client";

import {
  useState,
  useEffect,
  useCallback,
  KeyboardEvent,
} from "react";
import {
  Loader2,
  Sparkles,
  BrainCircuit,
  History,
  CheckCircle,
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import {
  Flashcard,
  FlashcardSet,
} from "@/types/flashcard";

// Display Modes
import GridMode from "@/components/display-modes/GridMode";
import StudyMode from "@/components/display-modes/StudyMode";
import ListMode from "@/components/display-modes/ListMode";
import DisplayController, {
  DisplayMode,
} from "@/components/DisplayController";

interface RateLimitError {
  code: number;
  message: string;
  retryDelay?: number;
}

const isRateLimitError = (
  err: unknown,
): err is RateLimitError => {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as Record<string, unknown>).code ===
      429 &&
    "message" in err &&
    typeof (err as Record<string, unknown>)
      .message === "string"
  );
};

export default function Home() {
  const [supabase] = useState(() =>
    createClient(),
  );
  const [topic, setTopic] = useState("");
  const [flashcards, setFlashcards] = useState<
    Flashcard[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<
    string | object | null
  >(null);
  const [countdown, setCountdown] = useState<
    number | null
  >(null);
  const [recentSets, setRecentSets] = useState<
    FlashcardSet[]
  >([]);
  const [savedSuccess, setSavedSuccess] =
    useState(false);
  const [quantity, setQuantity] = useState(5);
  const [userId, setUserId] = useState<
    string | null
  >(null);

  // Display Mode State
  const [mode, setMode] =
    useState<DisplayMode>("grid");

  // Check User
  useEffect(() => {
    const checkUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUserId(user?.id || null);
    };
    checkUser();
  }, [supabase]);

  // Load saved mode preference
  useEffect(() => {
    const savedMode = localStorage.getItem(
      "displayMode",
    ) as DisplayMode;
    if (
      savedMode &&
      ["grid", "study", "list"].includes(
        savedMode,
      )
    ) {
      setMode(savedMode);
    }
  }, []);

  // Fetch recent sets on mount (depend on userId)
  const fetchRecentSets =
    useCallback(async () => {
      let query = supabase
        .from("flashcard_sets")
        .select("*")
        .order("created_at", {
          ascending: false,
        })
        .limit(8);

      if (userId) {
        query = query.eq("user_id", userId);
      } else {
        // For guests, maybe show recent public ones? Or just local storage if we had it.
        // For now, let's show public ones (user_id is null)
        query = query.is("user_id", null);
      }

      const { data } = await query;

      if (data) {
        setRecentSets(data as FlashcardSet[]);
      }
    }, [supabase, userId]);

  useEffect(() => {
    fetchRecentSets();
  }, [fetchRecentSets]);

  const handleModeChange = (
    newMode: DisplayMode,
  ) => {
    setMode(newMode);
    localStorage.setItem(
      "displayMode",
      newMode,
    );
  };

  // Fisher-Yates Shuffle
  const shuffleArray = <T,>(
    array: T[],
  ): T[] => {
    const newArray = [...array];
    for (
      let i = newArray.length - 1;
      i > 0;
      i--
    ) {
      const j = Math.floor(
        Math.random() * (i + 1),
      );
      [newArray[i], newArray[j]] = [
        newArray[j],
        newArray[i],
      ];
    }
    return newArray;
  };

  const handleShuffle = () => {
    setFlashcards((prev) => shuffleArray(prev));
  };

  // Countdown effect
  useEffect(() => {
    if (countdown === null || countdown <= 0)
      return;
    const timer = setInterval(() => {
      setCountdown((prev) =>
        prev !== null && prev > 0
          ? prev - 1
          : 0,
      );
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  // Clear saved success message after 3 seconds
  useEffect(() => {
    if (savedSuccess) {
      const timer = setTimeout(
        () => setSavedSuccess(false),
        3000,
      );
      return () => clearTimeout(timer);
    }
  }, [savedSuccess]);

  const generateFlashcards = async () => {
    if (!topic.trim()) return;

    setLoading(true);
    setError(null);
    setCountdown(null);
    setFlashcards([]);
    setSavedSuccess(false);

    try {
      // Step A: Check DB First
      let query = supabase
        .from("flashcard_sets")
        .select("*")
        .ilike("topic", topic.trim());

      if (userId) {
        query = query.eq("user_id", userId);
      } else {
        query = query.is("user_id", null);
      }

      const {
        data: existingData,
        error: dbError,
      } = await query.limit(1).single();

      if (existingData) {
        console.log(
          "Found in DB:",
          existingData,
        );
        const existingCards =
          existingData.cards as Flashcard[];

        if (existingCards.length >= quantity) {
          // Case 1: DB has enough cards. Shuffle and display.
          console.log(
            `Found ${existingCards.length} cards in DB, requested ${quantity}. No API call needed.`,
          );
          const subset = shuffleArray(
            existingCards,
          ).slice(0, quantity);
          setFlashcards(subset);
          setSavedSuccess(true);
          setLoading(false);
          return;
        } else {
          // Case 2: DB has fewer cards. Append new ones.
          const needed =
            quantity - existingCards.length;
          console.log(
            `Found ${existingCards.length} cards in DB, need to create ${needed} more.`,
          );

          // Call API for missing cards (skipDb = true)
          const res = await fetch(
            "/api/generate",
            {
              method: "POST",
              headers: {
                "Content-Type":
                  "application/json",
              },
              body: JSON.stringify({
                topic,
                count: needed,
                skipDb: true,
              }),
            },
          );

          if (!res.ok)
            throw new Error(
              "Failed to fetch additional cards",
            );

          const data = await res.json();
          let newCards: Flashcard[] = [];

          if (Array.isArray(data))
            newCards = data;
          else if (
            data.flashcards &&
            Array.isArray(data.flashcards)
          )
            newCards = data.flashcards;
          else newCards = [];

          if (newCards.length > 0) {
            const mergedCards = [
              ...existingCards,
              ...newCards,
            ];

            // Update Supabase
            const { error: updateError } =
              await supabase
                .from("flashcard_sets")
                .update({ cards: mergedCards })
                .eq("id", existingData.id);

            if (updateError) {
              console.error(
                "Update Error:",
                updateError,
              );
              setError({
                message:
                  "Updated cards locally, but failed to save to DB.",
                details: updateError,
              });
            } else {
              console.log(
                "Supabase Updated with merged cards",
              );
              setSavedSuccess(true);
            }

            setFlashcards(mergedCards);
          } else {
            console.warn(
              "AI returned no cards to append.",
            );
            setFlashcards(existingCards);
          }
          setLoading(false);
          return;
        }
      }

      if (
        dbError &&
        dbError.code !== "PGRST116"
      ) {
        console.warn(
          "DB Check Error:",
          dbError,
        );
      }

      // Step B: Call AI & Save (New Topic)
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          topic,
          count: quantity,
          skipDb: false,
          userId,
        }),
      });

      if (!res.ok) {
        const errorData = await res
          .json()
          .catch(() => ({}));
        if (
          res.status === 429 ||
          errorData.error === "rate_limit"
        ) {
          const retryDelay =
            errorData.retryAfter || 30;
          throw new Error(
            JSON.stringify({
              code: 429,
              message:
                errorData.message ||
                `Hệ thống đang bận. Vui lòng đợi ${retryDelay} giây.`,
              retryDelay,
            }),
          );
        }
        const fullError =
          errorData.error || errorData;
        throw new Error(
          JSON.stringify(fullError),
        );
      }

      const data = await res.json();
      let cards: Flashcard[] = [];

      if (Array.isArray(data)) {
        cards = data;
      } else if (
        data.flashcards &&
        Array.isArray(data.flashcards)
      ) {
        cards = data.flashcards;
      } else {
        console.warn(
          "Unexpected API response format:",
          data,
        );
        cards = [];
      }

      setFlashcards(cards);

      // Handle Saved State & Errors
      if (data.id) {
        setSavedSuccess(true);
        fetchRecentSets(); // Refresh history
      } else if (data.dbError) {
        console.error(
          "Supabase Insert Error from API:",
          data.dbError,
        );
        setError({
          message:
            "Cards generated but failed to save to history.",
          details: data.dbError,
        });
      }
    } catch (err: unknown) {
      console.error("Error generating:", err);
      if (isRateLimitError(err)) {
        setCountdown(err.retryDelay || 30);
        setError(err.message);
      } else if (
        err instanceof Error &&
        err.message.startsWith("{")
      ) {
        try {
          const parsed = JSON.parse(
            err.message,
          );
          if (parsed.code === 429) {
            setCountdown(
              parsed.retryDelay || 30,
            );
            setError(parsed.message);
          } else {
            setError(
              parsed.message ||
                "Something went wrong",
            );
          }
        } catch {
          setError(err.message);
        }
      } else {
        setError(
          err instanceof Error
            ? err.message
            : "An unknown error occurred",
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const loadFromHistory = (
    set: FlashcardSet,
  ) => {
    setTopic(set.topic);
    setFlashcards(set.cards);
    setSavedSuccess(false); // Already saved
    setError(null);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header Section */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-extrabold tracking-tight text-transparent bg-clip-text bg-linear-to-r from-indigo-400 to-cyan-400 sm:text-5xl">
          AI Flashcards Generator
        </h1>
        <p className="text-lg text-slate-400 max-w-2xl mx-auto">
          Create flashcards instantly from any
          topic. Enter a subject, choose your
          quantity, and start learning.
        </p>
      </div>

      {/* Input Section */}
      <div className="bg-slate-800/50 rounded-2xl shadow-xl border border-slate-700/50 p-6 md:p-8 space-y-6 backdrop-blur-sm">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <label
              htmlFor="topic"
              className="block text-sm font-medium text-slate-300 mb-2"
            >
              What do you want to learn?
            </label>
            <input
              id="topic"
              type="text"
              value={topic}
              onChange={(e) =>
                setTopic(e.target.value)
              }
              placeholder="e.g., Quantum Physics, Spanish Verbs, React Hooks..."
              className="w-full px-4 py-3 rounded-xl border border-slate-600 bg-slate-900/50 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all text-white placeholder:text-slate-500"
              onKeyDown={(e: KeyboardEvent) =>
                e.key === "Enter" &&
                generateFlashcards()
              }
            />
          </div>
          <div className="w-full md:w-32">
            <label
              htmlFor="quantity"
              className="block text-sm font-medium text-slate-300 mb-2"
            >
              Quantity
            </label>
            <input
              id="quantity"
              type="number"
              min={1}
              max={50}
              value={quantity}
              onChange={(e) =>
                setQuantity(
                  Number(e.target.value),
                )
              }
              className="w-full px-4 py-3 rounded-xl border border-slate-600 bg-slate-900/50 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all text-white placeholder:text-slate-500"
            />
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
            <span className="font-bold">
              Error:
            </span>{" "}
            {typeof error === "string"
              ? error
              : JSON.stringify(error)}
          </div>
        )}

        {countdown !== null &&
          countdown > 0 && (
            <div className="p-4 bg-yellow-50 text-yellow-700 rounded-xl text-sm flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              System is busy. Retrying in{" "}
              {countdown}s...
            </div>
          )}

        <button
          onClick={generateFlashcards}
          disabled={loading || !topic.trim()}
          className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold text-lg hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-indigo-500/25 active:scale-[0.99]"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5" />
              Generate Flashcards
            </>
          )}
        </button>
      </div>

      {/* Main Content Area */}
      {flashcards.length > 0 && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
            <div className="flex items-center gap-2">
              <div className="bg-green-100 text-green-700 p-2 rounded-full">
                <BrainCircuit className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-bold text-gray-900">
                  {topic}
                </h2>
                <p className="text-xs text-gray-500">
                  {flashcards.length} cards
                  generated
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {savedSuccess && (
                <span className="text-green-600 text-sm font-medium flex items-center gap-1 bg-green-50 px-3 py-1 rounded-full">
                  <CheckCircle className="w-4 h-4" />
                  Saved to History
                </span>
              )}
              <button
                onClick={handleShuffle}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600"
                title="Shuffle Cards"
              >
                <History className="w-5 h-5" />
              </button>
              <DisplayController
                currentMode={mode}
                onModeChange={handleModeChange}
              />
            </div>
          </div>

          <div className="min-h-100">
            {mode === "grid" && (
              <GridMode
                flashcards={flashcards}
              />
            )}
            {mode === "study" && (
              <StudyMode
                flashcards={flashcards}
              />
            )}
            {mode === "list" && (
              <ListMode
                flashcards={flashcards}
              />
            )}
          </div>
        </div>
      )}

      {/* Recent History */}
      {recentSets.length > 0 && (
        <div className="pt-8 border-t border-gray-200">
          <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <History className="w-5 h-5" />
            Recent Sets
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {recentSets.map((set) => (
              <button
                key={set.id}
                onClick={() =>
                  loadFromHistory(set)
                }
                className="group text-left bg-white p-4 rounded-xl border border-gray-200 hover:border-black transition-all hover:shadow-md"
              >
                <div className="font-semibold text-gray-900 truncate mb-1 group-hover:text-indigo-600 transition-colors">
                  {set.topic}
                </div>
                <div className="flex justify-between items-center text-xs text-gray-500">
                  <span>
                    {set.cards?.length || 0}{" "}
                    cards
                  </span>
                  <span>
                    {new Date(
                      set.created_at,
                    ).toLocaleDateString()}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}