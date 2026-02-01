"use client";

import {
  useState,
  useEffect,
  KeyboardEvent,
} from "react";
import {
  Loader2,
  Sparkles,
  BrainCircuit,
  History,
  CheckCircle,
} from "lucide-react";
import Flashcard from "@/components/Flashcard";
import { supabase } from "@/lib/supabase";

interface FlashcardData {
  front: string;
  back: string;
}

interface FlashcardSet {
  id: string;
  topic: string;
  cards: FlashcardData[];
  created_at: string;
}

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
  const [topic, setTopic] = useState("");
  const [flashcards, setFlashcards] = useState<
    FlashcardData[]
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

  // Fetch recent sets on mount
  useEffect(() => {
    fetchRecentSets();
  }, []);

  const fetchRecentSets = async () => {
    const { data } = await supabase
      .from("flashcard_sets")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(8);

    if (data) {
      setRecentSets(data as FlashcardSet[]);
    }
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
      const {
        data: existingData,
        error: dbError,
      } = await supabase
        .from("flashcard_sets")
        .select("*")
        .ilike("topic", topic.trim())
        .limit(1)
        .single();

      if (existingData) {
        console.log(
          "Found in DB:",
          existingData,
        );
        setFlashcards(
          existingData.cards as FlashcardData[],
        );
        setSavedSuccess(true); // Technically not "saved" now, but "loaded" successfully
        setLoading(false);
        return;
      }

      if (
        dbError &&
        dbError.code !== "PGRST116"
      ) {
        // PGRST116 is "Row not found", which is fine. Other errors should be logged.
        console.warn(
          "DB Check Error:",
          dbError,
        );
      }

      // Step B: Call AI & Save
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ topic }),
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
      let cards: FlashcardData[] = [];

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

      // Handle Saved State
      if (data.id) {
        setSavedSuccess(true);
        fetchRecentSets(); // Refresh history
      }
    } catch (err: unknown) {
      let errorInfo: string | object =
        "Something went wrong.";
      if (err instanceof Error) {
        try {
          errorInfo = JSON.parse(err.message);
        } catch {
          errorInfo = err.message;
        }
      } else if (
        typeof err === "object" &&
        err !== null
      ) {
        errorInfo = err;
      }

      if (isRateLimitError(errorInfo)) {
        setError(errorInfo);
        if (
          typeof errorInfo.retryDelay ===
          "number"
        ) {
          setCountdown(errorInfo.retryDelay);
        }
      } else {
        setError(errorInfo);
        setCountdown(null);
      }
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter") generateFlashcards();
  };

  const loadFromHistory = (
    set: FlashcardSet,
  ) => {
    setTopic(set.topic);
    setFlashcards(set.cards);
    setError(null);
    setSavedSuccess(false);
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors duration-300">
      <div className="container mx-auto px-4 py-12 max-w-5xl">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full">
              <BrainCircuit className="w-10 h-10 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold bg-clip-text text-transparent bg-linear-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 mb-4">
            AI Flashcards Generator
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Generate study flashcards instantly
            with the power of Gemini AI. Enter a
            topic below to get started.
          </p>
        </div>

        {/* Input Section */}
        <div className="max-w-xl mx-auto mb-16">
          <div className="relative flex items-center">
            <input
              type="text"
              value={topic}
              onChange={(e) =>
                setTopic(e.target.value)
              }
              onKeyDown={handleKeyDown}
              placeholder="Enter a topic (e.g., React Hooks, Solar System)..."
              className="w-full px-6 py-4 text-lg rounded-full border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 outline-none transition-all dark:bg-gray-800 dark:border-gray-700 dark:text-white shadow-lg"
              disabled={loading}
            />
            <button
              onClick={generateFlashcards}
              disabled={
                loading || !topic.trim()
              }
              className="absolute right-2 p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-full transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
            >
              {loading ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <Sparkles className="w-6 h-6" />
              )}
            </button>
          </div>

          {/* Saved Success Message */}
          {savedSuccess && (
            <div className="mt-2 flex items-center justify-center text-green-600 dark:text-green-400 animate-fade-in">
              <CheckCircle className="w-4 h-4 mr-2" />
              <span className="text-sm font-medium">
                Saved to Database
              </span>
            </div>
          )}

          {error && (
            <div
              className={`mt-4 text-center font-medium animate-pulse overflow-auto max-h-60 p-4 rounded-lg ${
                isRateLimitError(error)
                  ? "bg-yellow-50 text-yellow-700 border border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400"
                  : "text-red-500 bg-red-50 dark:bg-red-900/20"
              }`}
            >
              {isRateLimitError(error) ? (
                <div>
                  <p>{error.message}</p>
                  {countdown !== null &&
                    countdown > 0 && (
                      <p className="text-sm mt-1 font-bold">
                        Thử lại sau: {countdown}
                        s
                      </p>
                    )}
                </div>
              ) : typeof error === "string" ? (
                error
              ) : (
                <pre className="text-left text-xs whitespace-pre-wrap font-mono">
                  {JSON.stringify(
                    error,
                    null,
                    2,
                  )}
                </pre>
              )}
            </div>
          )}

          {/* Recent Topics */}
          {recentSets.length > 0 && (
            <div className="mt-8">
              <div className="flex items-center gap-2 mb-3 text-gray-500 dark:text-gray-400">
                <History className="w-4 h-4" />
                <span className="text-sm font-medium uppercase tracking-wider">
                  Recent Topics
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {recentSets.map((set) => (
                  <button
                    key={set.id}
                    onClick={() =>
                      loadFromHistory(set)
                    }
                    className="px-3 py-1.5 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full hover:border-blue-500 dark:hover:border-blue-500 transition-colors shadow-sm"
                  >
                    {set.topic}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Grid Section */}
        {flashcards.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {flashcards.map((card, index) => (
              <Flashcard
                key={index}
                front={card.front}
                back={card.back}
              />
            ))}
          </div>
        )}

        {/* Empty State / Placeholder */}
        {!loading &&
          flashcards.length === 0 &&
          !error && (
            <div className="text-center text-gray-400 dark:text-gray-600 mt-12">
              <p>
                Ready to learn? Type a topic
                above!
              </p>
            </div>
          )}
      </div>
    </main>
  );
}
