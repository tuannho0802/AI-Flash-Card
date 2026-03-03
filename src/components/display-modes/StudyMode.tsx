import {
  useState,
  useEffect,
  useCallback,
} from "react";
import { Flashcard } from "@/types/flashcard";
import FlashcardCard from "./FlashcardCard";
import {
  ChevronLeft,
  ChevronRight,
  ThumbsUp,
  Meh,
  ThumbsDown,
} from "lucide-react";
import {
  motion,
  AnimatePresence,
} from "framer-motion";
import { useLearningProgress, Difficulty } from "@/hooks/useLearningProgress";

interface StudyModeProps {
  flashcards: Flashcard[];
}

export default function StudyMode({
  flashcards,
}: StudyModeProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isCardFlipped, setIsCardFlipped] = useState(false);
  const { markAs } = useLearningProgress();

  const [voted, setVoted] = useState<number | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [isVoting, setIsVoting] = useState(false);

  // Reset state when card changes
  useEffect(() => {
    setIsCardFlipped(false);
    setVoted(null);
    setStats(null);
  }, [currentIndex]);

  const handleCommunityVote = async (rating: number) => {
    if (isVoting || !flashcards[currentIndex]) return;
    setIsVoting(true);
    try {
      const response = await fetch("/api/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          setId: (flashcards[currentIndex] as any).set_id || null, // Assuming set_id is attached to flashcard objects
          cardIndex: (flashcards[currentIndex] as any).original_index ?? currentIndex,
          rating
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setVoted(rating);
        setStats(data.stats);
      }
    } catch (err) {
      console.error("Voting failed:", err);
    } finally {
      setIsVoting(false);
    }
  };

  const handleNext = useCallback(() => {
    if (currentIndex < flashcards.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setVoted(null);
      setStats(null);
    }
  }, [currentIndex, flashcards.length]);

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setVoted(null);
      setStats(null);
    }
  }, [currentIndex]);

  const handleRate = useCallback((difficulty: Difficulty) => {
    if (currentIndex >= 0 && currentIndex < flashcards.length) {
      markAs(flashcards[currentIndex].front, difficulty);

      // Also trigger community vote
      const rating = difficulty === "easy" ? 1 : difficulty === "medium" ? 2 : 3;
      handleCommunityVote(rating);

      if (currentIndex < flashcards.length - 1) {
        // Delay moving to next card to show "Thank You" or stats if flipped
        if (!isCardFlipped) {
          setCurrentIndex((prev) => prev + 1);
        }
      }
    }
  }, [currentIndex, flashcards, markAs, isCardFlipped]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (["INPUT", "TEXTAREA"].includes(document.activeElement?.tagName || "")) return;
      if (e.key === "ArrowRight") handleNext();
      if (e.key === "ArrowLeft") handlePrev();
      if (e.code === "Space") {
        e.preventDefault();
        setIsCardFlipped((prev) => !prev);
      }
      // Optional: Add shortcuts for Easy/Medium/Hard (e.g., 1, 2, 3)
      if (e.key === "1") handleRate("easy");
      if (e.key === "2") handleRate("medium");
      if (e.key === "3") handleRate("hard");
    };
    window.addEventListener(
      "keydown",
      handleKeyDown,
    );
    return () =>
      window.removeEventListener(
        "keydown",
        handleKeyDown,
      );
  }, [handleNext, handlePrev, handleRate]);

  return (
    <div className="flex flex-col items-center justify-center w-full max-w-3xl mx-auto min-h-150 px-4">
      {/* Progress Bar */}
      <div className="w-full mb-8 max-w-xl">
        <div className="flex justify-between text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
          <span>Progress</span>
          <span>
            {Math.round(
              ((currentIndex + 1) /
                flashcards.length) *
                100,
            )}
            %
          </span>
        </div>
        <div className="w-full h-2.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-linear-to-r from-blue-500 to-purple-600"
            initial={{ width: 0 }}
            animate={{
              width: `${((currentIndex + 1) / flashcards.length) * 100}%`,
            }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      {/* Card Area */}
      <div className="w-full relative h-100 flex justify-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{
              opacity: 0,
              x: 50,
              scale: 0.95,
            }}
            animate={{
              opacity: 1,
              x: 0,
              scale: 1,
            }}
            exit={{
              opacity: 0,
              x: -50,
              scale: 0.95,
            }}
            transition={{ duration: 0.3 }}
            className="w-full h-full max-w-xl"
          >
            <FlashcardCard
              card={flashcards[currentIndex]}
              className="h-full! text-2xl"
              isFlipped={isCardFlipped}
              onFlip={setIsCardFlipped}
            />

            {/* Community Stats Overlay (Visible when flipped and voted) */}
            <AnimatePresence>
              {isCardFlipped && stats && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute bottom-4 left-4 right-4 bg-slate-900/80 backdrop-blur-md rounded-xl p-3 border border-white/10 z-20"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Đánh giá cộng đồng ({stats.total_votes})</span>
                    <div className="flex gap-1">
                      <div className="w-2 h-2 rounded-full bg-emerald-500" />
                      <div className="w-2 h-2 rounded-full bg-amber-500" />
                      <div className="w-2 h-2 rounded-full bg-rose-500" />
                    </div>
                  </div>
                  <div className="flex h-1.5 rounded-full overflow-hidden bg-slate-800">
                    <div
                      className="h-full bg-emerald-500 transition-all duration-500"
                      style={{ width: `${(stats.easy_count / stats.total_votes) * 100}%` }}
                    />
                    <div
                      className="h-full bg-amber-500 transition-all duration-500"
                      style={{ width: `${(stats.medium_count / stats.total_votes) * 100}%` }}
                    />
                    <div
                      className="h-full bg-rose-500 transition-all duration-500"
                      style={{ width: `${(stats.hard_count / stats.total_votes) * 100}%` }}
                    />
                  </div>
                  <div className="flex justify-between mt-1.5 text-[9px] font-medium text-slate-500">
                    <span>Dễ: {Math.round((stats.easy_count / stats.total_votes) * 100)}%</span>
                    <span>Vừa: {Math.round((stats.medium_count / stats.total_votes) * 100)}%</span>
                    <span>Khó: {Math.round((stats.hard_count / stats.total_votes) * 100)}%</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* SRS Controls / Voting */}
      <div className="mt-8 w-full max-w-xl">
        <AnimatePresence mode="wait">
          {!isCardFlipped ? (
            <motion.div
              key="hint"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-4 bg-slate-800/20 rounded-2xl border border-dashed border-slate-700 text-slate-500 text-sm"
            >
              Lật thẻ để đánh giá độ khó
            </motion.div>
          ) : (
            <motion.div
              key="voting-controls"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-center gap-4"
            >
              <button
                onClick={() => handleRate("easy")}
                  disabled={isVoting}
                  className={`flex flex-col items-center justify-center w-24 h-24 rounded-2xl transition-all relative overflow-hidden group ${voted === 1
                      ? "bg-emerald-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.4)]"
                      : "bg-slate-800/40 text-slate-400 border border-slate-700 hover:border-emerald-500/50 hover:text-emerald-400"
                    }`}
                >
                  <ThumbsUp className={`w-7 h-7 mb-1.5 transition-transform group-hover:scale-110 ${voted === 1 ? "animate-bounce" : ""}`} />
                  <span className="text-xs font-black uppercase tracking-widest">Dễ</span>
                  {voted === 1 && <motion.div layoutId="vote-indicator" className="absolute top-1 right-1 w-2 h-2 rounded-full bg-white shadow-sm" />}
                </button>

                <button
                  onClick={() => handleRate("medium")}
                  disabled={isVoting}
                  className={`flex flex-col items-center justify-center w-24 h-24 rounded-2xl transition-all relative overflow-hidden group ${voted === 2
                      ? "bg-amber-500 text-white shadow-[0_0_20px_rgba(245,158,11,0.4)]"
                      : "bg-slate-800/40 text-slate-400 border border-slate-700 hover:border-amber-500/50 hover:text-amber-400"
                    }`}
                >
                  <Meh className={`w-7 h-7 mb-1.5 transition-transform group-hover:scale-110 ${voted === 2 ? "animate-bounce" : ""}`} />
                  <span className="text-xs font-black uppercase tracking-widest">Vừa</span>
                  {voted === 2 && <motion.div layoutId="vote-indicator" className="absolute top-1 right-1 w-2 h-2 rounded-full bg-white shadow-sm" />}
                </button>

                <button
                  onClick={() => handleRate("hard")}
                  disabled={isVoting}
                  className={`flex flex-col items-center justify-center w-24 h-24 rounded-2xl transition-all relative overflow-hidden group ${voted === 3
                      ? "bg-rose-500 text-white shadow-[0_0_20px_rgba(244,63,94,0.4)]"
                      : "bg-slate-800/40 text-slate-400 border border-slate-700 hover:border-rose-500/50 hover:text-rose-400"
                    }`}
                >
                  <ThumbsDown className={`w-7 h-7 mb-1.5 transition-transform group-hover:scale-110 ${voted === 3 ? "animate-bounce" : ""}`} />
                  <span className="text-xs font-black uppercase tracking-widest">Khó</span>
                  {voted === 3 && <motion.div layoutId="vote-indicator" className="absolute top-1 right-1 w-2 h-2 rounded-full bg-white shadow-sm" />}
                </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Navigation Controls */}
      <div className="flex items-center gap-8 mt-8">
        <button
          onClick={handlePrev}
          disabled={currentIndex === 0}
          className="p-4 rounded-full bg-white dark:bg-gray-800 shadow-md border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
          aria-label="Previous Card"
        >
          <ChevronLeft className="w-6 h-6 text-gray-600 dark:text-gray-300" />
        </button>

        <div className="flex flex-col items-center">
          <span className="text-2xl font-bold text-gray-800 dark:text-white">
            {currentIndex + 1}
          </span>
          <span className="text-xs text-gray-500 uppercase tracking-wider">
            of {flashcards.length}
          </span>
        </div>

        <button
          onClick={handleNext}
          disabled={
            currentIndex ===
            flashcards.length - 1
          }
          className="p-4 rounded-full bg-blue-600 text-white shadow-lg shadow-blue-500/30 hover:bg-blue-700 disabled:opacity-50 disabled:shadow-none disabled:bg-gray-300 dark:disabled:bg-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed transition-all active:scale-95"
          aria-label="Next Card"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      </div>

      <p className="mt-8 text-sm text-gray-400 italic">
        Tip: Use Arrow keys to navigate
      </p>
    </div>
  );
}
