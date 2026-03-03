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
  onModeChange?: (mode: any) => void;
  isFocusMode?: boolean;
}

export default function StudyMode({
  flashcards,
  onModeChange,
  isFocusMode = false,
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
    <div className={`flex flex-col items-center w-full max-w-2xl mx-auto px-4 overflow-hidden ${isFocusMode ? "max-h-screen py-0 gap-1" : "max-h-[calc(100vh-160px)] py-2 gap-2"}`}>
      {/* Progress Bar - Minimalist */}
      {!isFocusMode && (
        <div className="w-full shrink-0">
          <div className="flex justify-between text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 font-sans">
            <span>TIẾN ĐỘ</span>
            <span>
              {Math.round(
                ((currentIndex + 1) /
                  flashcards.length) *
                100,
              )}
              %
            </span>
          </div>
          <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-linear-to-r from-blue-500 to-indigo-600 shadow-[0_0_8px_rgba(79,70,229,0.3)]"
              initial={{ width: 0 }}
              animate={{
                width: `${((currentIndex + 1) / flashcards.length) * 100}%`,
              }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>
      )}

      {/* Card Area - Max-h 50vh or 55vh with internal scroll via isCompact */}
      <div className={`w-full flex-1 min-h-0 flex flex-col items-center justify-center relative ${isFocusMode ? "py-0" : "py-1"}`}>
        <div className={`w-full aspect-[4/3] flex justify-center ${isFocusMode ? "max-h-[55vh]" : "max-h-[50vh]"}`}>
          <AnimatePresence mode="wait">
            <motion.div
              key={currentIndex}
              initial={{
                opacity: 0,
                x: 20,
              }}
              animate={{
                opacity: 1,
                x: 0,
              }}
              exit={{
                opacity: 0,
                x: -20,
              }}
              transition={{ duration: 0.25 }}
              className="w-full h-full"
            >
              <FlashcardCard
                card={flashcards[currentIndex]}
                className="shadow-2xl shadow-indigo-500/10"
                isFlipped={isCardFlipped}
                onFlip={setIsCardFlipped}
                isCompact={true}
              />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Community Stats Section - Compact & Attached to card bottom */}
      <div className={`w-full shrink-0 min-h-[40px] ${isFocusMode ? "mb-1" : "mb-0"}`}>
        <AnimatePresence>
          {isCardFlipped && currentStats && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={`bg-slate-800/30 backdrop-blur-sm rounded-xl border border-slate-700/50 ${isFocusMode ? "p-2" : "p-3"}`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-sans">
                  ĐÁNH GIÁ CỘNG ĐỒNG ({currentStats.total_votes})
                </span>
                <div className="flex gap-1">
                  <div className="w-1 h-1 rounded-full bg-emerald-500" />
                  <div className="w-1 h-1 rounded-full bg-amber-500" />
                  <div className="w-1 h-1 rounded-full bg-rose-500" />
                </div>
              </div>
              <div className="flex h-1.5 rounded-full overflow-hidden bg-slate-800/50">
                <div
                  className="h-full bg-emerald-500 transition-all duration-500"
                  style={{ width: `${(currentStats.easy_count / currentStats.total_votes) * 100}%` }}
                />
                <div
                  className="h-full bg-amber-500 transition-all duration-500"
                  style={{ width: `${(currentStats.medium_count / currentStats.total_votes) * 100}%` }}
                />
                <div
                  className="h-full bg-rose-500 transition-all duration-500"
                  style={{ width: `${(currentStats.hard_count / currentStats.total_votes) * 100}%` }}
                />
              </div>
              <div className="flex justify-between mt-1.5 text-[10px] font-bold text-slate-400 font-sans uppercase">
                <span>DỄ: {Math.round((currentStats.easy_count / currentStats.total_votes) * 100)}%</span>
                <span>VỪA: {Math.round((currentStats.medium_count / currentStats.total_votes) * 100)}%</span>
                <span>KHÓ: {Math.round((currentStats.hard_count / currentStats.total_votes) * 100)}%</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Interaction Controls */}
      <div className="w-full shrink-0 flex flex-col items-center">
        {/* Voting Row */}
        <div className={`w-full flex items-center justify-center relative ${isFocusMode ? "h-[50px]" : "h-[60px]"}`}>
          <AnimatePresence>
            {showConfirmModal && (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => { setShowConfirmModal(false); setPendingVote(null); }}
                  className="fixed inset-0 bg-black/40 backdrop-blur-[1px] z-[100]"
                />
                <div className="fixed inset-0 z-[110] flex items-center justify-center pointer-events-none px-4">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-slate-900 border border-slate-700/50 rounded-2xl p-6 shadow-2xl pointer-events-auto w-full max-w-[320px] text-center"
                  >
                    <p className="text-sm font-bold text-slate-100 uppercase tracking-wide mb-6 font-sans">
                      Thay đổi đánh giá?
                    </p>
                    <div className="flex gap-3">
                      <button
                        onClick={() => { setShowConfirmModal(false); setPendingVote(null); }}
                        className="flex-1 py-3 rounded-xl bg-slate-800 text-slate-400 text-[10px] font-bold uppercase transition-all active:scale-95 font-sans"
                      >
                        HỦY
                      </button>
                      <button
                        onClick={() => pendingVote && handleCommunityVote(pendingVote)}
                        className="flex-1 py-3 rounded-xl bg-indigo-600 text-white text-[10px] font-bold uppercase shadow-lg shadow-indigo-500/20 transition-all active:scale-95 font-sans"
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
                className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.2em] font-sans"
              >
                Lật thẻ để đánh giá
              </motion.div>
            ) : (
              <motion.div
                  key="voting"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex gap-2 w-full justify-center"
                >
                  {[
                    { id: 1, label: "DỄ", color: "emerald", icon: ThumbsUp, complexity: "easy" },
                    { id: 2, label: "VỪA", color: "amber", icon: Meh, complexity: "medium" },
                    { id: 3, label: "KHÓ", color: "rose", icon: ThumbsDown, complexity: "hard" }
                  ].map((btn) => (
                    <button
                      key={btn.id}
                      onClick={() => handleRate(btn.complexity as Difficulty)}
                      disabled={isVoting || showConfirmModal}
                      className={`flex-1 max-w-[120px] flex flex-col items-center py-2 rounded-xl border transition-all ${userCurrentVote === btn.id
                        ? `bg-${btn.color}-500 border-${btn.color}-400 text-white shadow-lg shadow-${btn.color}-500/20`
                        : "bg-slate-800/40 text-slate-400 border-slate-700/50 hover:bg-slate-800/80 font-sans"
                    }`}
                    >
                      <btn.icon className={`w-4 h-4 mb-1 ${userCurrentVote === btn.id ? "animate-pulse" : ""}`} />
                      <span className="text-[10px] font-bold uppercase tracking-widest">{btn.label}</span>
                    </button>
                  ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Navigation Controls - Minimalist */}
        <div className={`w-full flex items-center justify-between gap-4 font-sans ${isFocusMode ? "mt-1 mb-2" : "mt-2 mb-4"}`}>
          <button
            onClick={handlePrev}
            disabled={currentIndex === 0 || showConfirmModal}
            className={`${isFocusMode ? "p-2" : "p-3"} rounded-xl bg-slate-800/50 border border-slate-700/50 text-slate-400 disabled:opacity-20 active:scale-90 transition-all`}
          >
            <ChevronLeft className={`${isFocusMode ? "w-4 h-4" : "w-5 h-5"}`} />
          </button>

          <div className="flex flex-col items-center">
            <span className={`${isFocusMode ? "text-lg" : "text-xl"} font-black text-slate-100 tabular-nums`}>
              {currentIndex + 1} <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest ml-1">/ {flashcards.length}</span>
            </span>
          </div>

          <button
            onClick={handleNext}
            disabled={currentIndex === flashcards.length - 1 || showConfirmModal}
            className={`${isFocusMode ? "p-2" : "p-3"} rounded-xl bg-indigo-600 border border-indigo-400/20 text-white shadow-lg shadow-indigo-500/20 disabled:opacity-20 active:scale-90 transition-all font-sans`}
          >
            <ChevronRight className={`${isFocusMode ? "w-4 h-4" : "w-5 h-5"}`} />
          </button>
        </div>
      </div>
    </div>
  );
}
