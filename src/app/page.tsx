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
} from "lucide-react";
import Flashcard from "@/components/Flashcard";

interface FlashcardData {
  front: string;
  back: string;
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

  const generateFlashcards = async () => {
    if (!topic.trim()) return;

    setLoading(true);
    setError(null);
    setCountdown(null);
    setFlashcards([]);

    try {
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

        // Handle Rate Limit (429) specifically
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

        // Store full error object for debugging
        const fullError =
          errorData.error || errorData;
        throw new Error(
          JSON.stringify(fullError),
        );
      }

      const data = await res.json();

      if (Array.isArray(data)) {
        setFlashcards(data);
      } else if (
        data.flashcards &&
        Array.isArray(data.flashcards)
      ) {
        // Fallback if API returns { flashcards: [...] }
        setFlashcards(data.flashcards);
      } else {
        // Attempt to extract if it's just the items directly or inside an object
        // Based on our schema, it should be an array.
        setFlashcards(data);
      }
    } catch (err: unknown) {
      let errorInfo: string | object =
        "Something went wrong.";

      if (err instanceof Error) {
        try {
          // Try to parse the error message back to JSON if it was stringified
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

      // Check if it's our custom 429 error object
      if (isRateLimitError(errorInfo)) {
        setError(errorInfo.message);
      } else {
        setError(errorInfo);
      }

      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter") {
      generateFlashcards();
    }
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
          {error && (
            <div className="mt-4 text-center text-red-500 font-medium animate-pulse overflow-auto max-h-60 bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
              {typeof error === "string" ? (
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
