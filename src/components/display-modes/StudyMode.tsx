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

  const [userVotes, setUserVotes] = useState<Record<number, number>>({});
  const [allStats, setAllStats] = useState<Record<number, any>>({});
  const [isVoting, setIsVoting] = useState(false);

  // Re-vote confirmation state
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingVote, setPendingVote] = useState<number | null>(null);

  // Fetch all votes and stats for this set
  useEffect(() => {
    const setId = (flashcards[0] as any)?.set_id;
    if (!setId) return;

    const loadVotesAndStats = async () => {
      try {
        const res = await fetch(`/api/vote?setId=${setId}`);
        if (res.ok) {
          const data = await res.json();
          setUserVotes(data.userVotes || {});
          setAllStats(data.stats || {});
        }
      } catch (err) {
        console.error("Failed to load votes:", err);
      }
    };

    loadVotesAndStats();
  }, [flashcards]);

  // Reset isCardFlipped when card changes
  useEffect(() => {
    setIsCardFlipped(false);
  }, [currentIndex]);

  const currentCardMeta = {
    setId: (flashcards[currentIndex] as any)?.set_id || null,
    cardIndex: (flashcards[currentIndex] as any)?.original_index ?? currentIndex,
  };

  const handleCommunityVote = async (rating: number) => {
    if (isVoting || !currentCardMeta.setId) return;

    // Check if user is changing their vote
    const previousRating = userVotes[currentCardMeta.cardIndex];
    if (previousRating && previousRating !== rating && !showConfirmModal) {
      setPendingVote(rating);
      setShowConfirmModal(true);
      return;
    }

    if (previousRating === rating) return; // Same vote, do nothing

    setIsVoting(true);
    setShowConfirmModal(false);

    try {
      const response = await fetch("/api/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          setId: currentCardMeta.setId,
          cardIndex: currentCardMeta.cardIndex,
          rating
        }),
      });

      if (response.ok) {
        const data = await response.json();
        // Update local state immediately
        setUserVotes(prev => ({ ...prev, [currentCardMeta.cardIndex]: rating }));
        setAllStats(prev => ({ ...prev, [currentCardMeta.cardIndex]: data.stats }));
      }
    } catch (err) {
      console.error("Voting failed:", err);
    } finally {
      setIsVoting(false);
      setPendingVote(null);
    }
  };

  const handleNext = useCallback(() => {
    if (currentIndex < flashcards.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  }, [currentIndex, flashcards.length]);

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  }, [currentIndex]);

  const handleRate = useCallback((difficulty: Difficulty) => {
    if (currentIndex >= 0 && currentIndex < flashcards.length) {
      markAs(flashcards[currentIndex].front, difficulty);

      const rating = difficulty === "easy" ? 1 : difficulty === "medium" ? 2 : 3;
      handleCommunityVote(rating);

      if (currentIndex < flashcards.length - 1 && !isCardFlipped) {
        setCurrentIndex((prev) => prev + 1);
      }
    }
  }, [currentIndex, flashcards, markAs, isCardFlipped, userVotes, currentCardMeta, handleCommunityVote]);

  const currentStats = allStats[currentCardMeta.cardIndex];
  const userCurrentVote = userVotes[currentCardMeta.cardIndex];

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent any interactions if confirmation modal is open
      if (showConfirmModal) {
        if (e.key === "Escape") {
          setShowConfirmModal(false);
          setPendingVote(null);
        }
        return;
      }

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
  }, [handleNext, handlePrev, handleRate, showConfirmModal]);

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
      <div className="w-full relative flex flex-col items-center">
        <div className="w-full h-100 flex justify-center mb-6">
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
                className="h-full! text-2xl shadow-xl shadow-indigo-500/5"
                isFlipped={isCardFlipped}
                onFlip={setIsCardFlipped}
              />
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Community Stats Section (Moved outside of Card, above buttons) */}
        <div className="w-full max-w-xl min-h-[70px]">
          <AnimatePresence>
            {isCardFlipped && currentStats && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 5 }}
                className="bg-slate-800/20 backdrop-blur-sm rounded-2xl p-4 border border-slate-700/50"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-sans">
                    Đánh giá cộng đồng ({currentStats.total_votes})
                  </span>
                  <div className="flex gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]" />
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.3)]" />
                    <div className="w-1.5 h-1.5 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.3)]" />
                  </div>
                </div>
                <div className="flex h-2 rounded-full overflow-hidden bg-slate-800/50">
                  <div
                    className="h-full bg-emerald-500 transition-all duration-700 ease-out"
                    style={{ width: `${(currentStats.easy_count / currentStats.total_votes) * 100}%` }}
                  />
                  <div
                    className="h-full bg-amber-500 transition-all duration-700 ease-out"
                    style={{ width: `${(currentStats.medium_count / currentStats.total_votes) * 100}%` }}
                  />
                  <div
                    className="h-full bg-rose-500 transition-all duration-700 ease-out"
                    style={{ width: `${(currentStats.hard_count / currentStats.total_votes) * 100}%` }}
                  />
                </div>
                <div className="flex justify-between mt-2.5 text-[10px] font-medium text-slate-400 font-sans">
                  <span>Dễ: {Math.round((currentStats.easy_count / currentStats.total_votes) * 100)}%</span>
                  <span>Vừa: {Math.round((currentStats.medium_count / currentStats.total_votes) * 100)}%</span>
                  <span>Khó: {Math.round((currentStats.hard_count / currentStats.total_votes) * 100)}%</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* SRS Controls / Voting */}
      <div className="mt-8 w-full max-w-xl relative">
        <AnimatePresence>
          {showConfirmModal && (
            <>
              {/* Backdrop Overlay */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => { setShowConfirmModal(false); setPendingVote(null); }}
                className="fixed inset-0 bg-black/60 backdrop-blur-[2px] z-[100]"
              />

              {/* Modal Container */}
              <div className="fixed inset-0 z-[110] flex items-center justify-center pointer-events-none px-4">
                <motion.div
                  key="confirm-modal"
                  initial={{ opacity: 0, scale: 0.98, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98, y: 10 }}
                  transition={{ duration: 0.15 }}
                  className="bg-slate-900 border border-slate-800 rounded-3xl p-7 shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex flex-col items-center gap-6 pointer-events-auto w-full max-w-[360px]"
                >
                  <p className="text-base font-medium text-slate-100 text-center uppercase tracking-wide leading-relaxed font-sans">
                    Bạn muốn thay đổi đánh giá cho thẻ này?
                  </p>
                  <div className="flex gap-3 w-full">
                    <button
                      onClick={() => { setShowConfirmModal(false); setPendingVote(null); }}
                      className="flex-1 px-5 py-3 rounded-xl bg-slate-800 text-slate-400 text-xs font-bold hover:bg-slate-700 transition-all active:scale-95 font-sans"
                    >
                      HỦY
                    </button>
                    <button
                      onClick={() => pendingVote && handleCommunityVote(pendingVote)}
                      className="flex-1 px-5 py-3 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-500 shadow-lg shadow-indigo-500/20 transition-all active:scale-95 uppercase font-sans"
                    >
                      XÁC NHẬN
                    </button>
                  </div>
                </motion.div>
              </div>
            </>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {!isCardFlipped ? (
            <motion.div
              key="hint"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-5 bg-slate-800/10 rounded-2xl border border-dashed border-slate-800/50 text-slate-500 text-sm font-sans"
            >
              Lật thẻ để đánh giá độ khó
            </motion.div>
          ) : (
            <motion.div
              key="voting-controls"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
                className={`flex items-center justify-center gap-4 transition-all duration-500 ${showConfirmModal ? "blur-md opacity-20 pointer-events-none scale-95" : ""}`}
            >
              <button
                onClick={() => handleRate("easy")}
                  disabled={isVoting || showConfirmModal}
                  className={`flex flex-col items-center justify-center w-24 h-24 rounded-2xl transition-all relative overflow-hidden group ${userCurrentVote === 1
                    ? "bg-emerald-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.3)] ring-2 ring-emerald-400/30"
                    : "bg-slate-800/40 text-slate-400 border border-slate-700/50 hover:border-emerald-500/50 hover:text-emerald-400 outline-none"
                    }`}
                >
                  <ThumbsUp className={`w-7 h-7 mb-2 transition-transform group-hover:scale-110 ${userCurrentVote === 1 ? "animate-bounce" : ""}`} />
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] font-sans">Dễ</span>
                  {userCurrentVote === 1 && <motion.div layoutId="vote-indicator" className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-white shadow-sm" />}
                </button>

                <button
                  onClick={() => handleRate("medium")}
                  disabled={isVoting || showConfirmModal}
                  className={`flex flex-col items-center justify-center w-24 h-24 rounded-2xl transition-all relative overflow-hidden group ${userCurrentVote === 2
                    ? "bg-amber-500 text-white shadow-[0_0_20px_rgba(245,158,11,0.3)] ring-2 ring-amber-400/30"
                    : "bg-slate-800/40 text-slate-400 border border-slate-700/50 hover:border-amber-500/50 hover:text-amber-400 outline-none"
                    }`}
                >
                  <Meh className={`w-7 h-7 mb-2 transition-transform group-hover:scale-110 ${userCurrentVote === 2 ? "animate-bounce" : ""}`} />
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] font-sans">Vừa</span>
                  {userCurrentVote === 2 && <motion.div layoutId="vote-indicator" className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-white shadow-sm" />}
                </button>

                <button
                  onClick={() => handleRate("hard")}
                  disabled={isVoting || showConfirmModal}
                  className={`flex flex-col items-center justify-center w-24 h-24 rounded-2xl transition-all relative overflow-hidden group ${userCurrentVote === 3
                    ? "bg-rose-500 text-white shadow-[0_0_20px_rgba(244,63,94,0.3)] ring-2 ring-rose-400/30"
                    : "bg-slate-800/40 text-slate-400 border border-slate-700/50 hover:border-rose-500/50 hover:text-rose-400 outline-none"
                    }`}
                >
                  <ThumbsDown className={`w-7 h-7 mb-2 transition-transform group-hover:scale-110 ${userCurrentVote === 3 ? "animate-bounce" : ""}`} />
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] font-sans">Khó</span>
                  {userCurrentVote === 3 && <motion.div layoutId="vote-indicator" className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-white shadow-sm" />}
                </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {userCurrentVote && isCardFlipped && (
        <motion.p
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-[9px] text-slate-500 mt-4 font-bold uppercase tracking-[0.1em] font-sans flex items-center gap-1.5"
        >
          Trạng thái: <span className={userCurrentVote === 1 ? "text-emerald-500" : userCurrentVote === 2 ? "text-amber-500" : "text-rose-500"}>{userCurrentVote === 1 ? "ĐÃ CHỌN DỄ" : userCurrentVote === 2 ? "ĐÃ CHỌN VỪA" : "ĐÃ CHỌN KHÓ"}</span>
        </motion.p>
      )}

      {/* Navigation Controls */}
      <div className="flex items-center gap-10 mt-10">
        <button
          onClick={handlePrev}
          disabled={currentIndex === 0 || showConfirmModal}
          className="p-4 rounded-2xl bg-slate-800/40 backdrop-blur-md border border-slate-700/50 hover:bg-slate-700 hover:text-white dark:text-slate-400 disabled:opacity-20 disabled:cursor-not-allowed transition-all active:scale-95 shadow-lg"
          aria-label="Previous Card"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>

        <div className="flex flex-col items-center min-w-[60px]">
          <span className="text-3xl font-black text-slate-100 tracking-tighter tabular-nums">
            {currentIndex + 1}
          </span>
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">
            / {flashcards.length}
          </span>
        </div>

        <button
          onClick={handleNext}
          disabled={
            currentIndex ===
            flashcards.length - 1 || showConfirmModal
          }
          className="p-4 rounded-2xl bg-indigo-600 text-white shadow-xl shadow-indigo-500/20 hover:bg-indigo-500 hover:scale-105 disabled:opacity-20 disabled:shadow-none disabled:bg-slate-800/40 disabled:text-slate-600 disabled:cursor-not-allowed transition-all active:scale-95"
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
