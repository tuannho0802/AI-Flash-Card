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

    if (previousRating === rating) return; 

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
        // UI already updated in handleRate (Animation-First)
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
      // 1. Animation-First: Instant UI Update
      const rating = difficulty === "easy" ? 1 : difficulty === "medium" ? 2 : 3;

      // If it's the same vote, do nothing
      if (userVotes[currentCardMeta.cardIndex] === rating) return;

      // Handle re-vote confirmation
      const previousRating = userVotes[currentCardMeta.cardIndex];
      if (previousRating && previousRating !== rating && !showConfirmModal) {
        setPendingVote(rating);
        setShowConfirmModal(true);
        return;
      }

      // Update state immediately for instant feedback
      setUserVotes(prev => ({ ...prev, [currentCardMeta.cardIndex]: rating }));

      // 2. Logic Execution
      markAs(flashcards[currentIndex].front, difficulty);
      handleCommunityVote(rating);

      // 3. Delayed Auto-Advance (0.7s) to appreciate feedback
      if (currentIndex < flashcards.length - 1 && !isCardFlipped) {
        setTimeout(() => {
          setCurrentIndex((prev) => prev + 1);
        }, 700);
      }
    }
  }, [currentIndex, flashcards, markAs, isCardFlipped, userVotes, currentCardMeta, handleCommunityVote, showConfirmModal]);

  const currentStats = allStats[currentCardMeta.cardIndex];
  const userCurrentVote = userVotes[currentCardMeta.cardIndex];

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
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
      if (e.key === "1") handleRate("easy");
      if (e.key === "2") handleRate("medium");
      if (e.key === "3") handleRate("hard");
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleNext, handlePrev, handleRate, showConfirmModal]);

  return (
    <div className={`flex flex-col items-center w-full max-w-2xl mx-auto p-4 overflow-hidden h-[calc(100vh-80px)] font-sans ${isFocusMode ? "gap-1" : "gap-2"}`}>
      {/* Progress Bar - Minimalist */}
      {!isFocusMode && (
        <div className="w-full shrink-0 mb-2">
          <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
            <span>TIẾN ĐỘ</span>
            <span>
              {Math.round(((currentIndex + 1) / flashcards.length) * 100)}%
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

      {/* 1. Flashcard Area - Flex-grow to occupy space, max-h to prevent push */}
      <div className="w-full flex-grow flex flex-col items-center justify-center relative overflow-hidden min-h-0 py-2">
        <div className={`w-full h-full max-h-[50vh] aspect-[4/3] flex justify-center relative mx-auto`}>
          <AnimatePresence mode="wait">
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
              className="w-full h-full relative"
            >
              <FlashcardCard
                card={flashcards[currentIndex]}
                className="shadow-2xl shadow-indigo-500/10 rounded-3xl"
                isFlipped={isCardFlipped}
                onFlip={setIsCardFlipped}
                isCompact={true}
              />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* 2. Community Stats Section - Static Slot below Card */}
      <div className="w-full shrink-0 min-h-[40px] my-4">
        <AnimatePresence>
          {isCardFlipped && currentStats && (
            <motion.div
              layout
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`bg-slate-800/60 backdrop-blur-xl rounded-2xl border border-slate-700/50 ${isFocusMode ? "p-2" : "p-4"}`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">
                  ĐÁNH GIÁ CỘNG ĐỒNG ({currentStats.total_votes})
                </span>
                <div className="flex gap-1.5">
                  <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 2 }} className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 2, delay: 0.3 }} className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 2, delay: 0.6 }} className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                </div>
              </div>
              <div className="flex h-2 rounded-full overflow-hidden bg-slate-950/50 border border-slate-800/50">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(currentStats.easy_count / currentStats.total_votes) * 100}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  className="h-full bg-linear-to-r from-emerald-600 to-emerald-400"
                />
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(currentStats.medium_count / currentStats.total_votes) * 100}%` }}
                  transition={{ duration: 0.8, ease: "easeOut", delay: 0.1 }}
                  className="h-full bg-linear-to-r from-amber-600 to-amber-400 border-l border-white/5"
                />
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(currentStats.hard_count / currentStats.total_votes) * 100}%` }}
                  transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
                  className="h-full bg-linear-to-r from-rose-600 to-rose-400 border-l border-white/5"
                />
              </div>
              <div className="flex justify-between mt-2.5 text-[10px] font-black text-slate-400 uppercase leading-none">
                <span className="text-emerald-500/80">DỄ: {Math.round((currentStats.easy_count / currentStats.total_votes) * 100)}%</span>
                <span className="text-amber-500/80">VỪA: {Math.round((currentStats.medium_count / currentStats.total_votes) * 100)}%</span>
                <span className="text-rose-500/80">KHÓ: {Math.round((currentStats.hard_count / currentStats.total_votes) * 100)}%</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 3. Footer Cluster - Navigation & Voting locked to bottom */}
      <div className="w-full mt-auto shrink-0 flex flex-col gap-4 pb-2">
        {/* Voting Row */}
        <div className="w-full flex items-center justify-center relative min-h-[60px]">
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
                    className="bg-slate-900 border border-slate-700/50 rounded-3xl p-6 shadow-2xl pointer-events-auto w-full max-w-[320px] text-center"
                  >
                    <p className="text-sm font-black text-slate-100 uppercase tracking-wide mb-6 leading-relaxed">
                      Thay đổi đánh giá?
                    </p>
                    <div className="flex gap-3">
                      <button
                        onClick={() => { setShowConfirmModal(false); setPendingVote(null); }}
                        className="flex-1 py-3 rounded-2xl bg-slate-800 text-slate-400 text-[10px] font-black uppercase transition-all active:scale-95"
                      >
                        HỦY
                      </button>
                      <button
                        onClick={() => pendingVote && handleCommunityVote(pendingVote)}
                        className="flex-1 py-3 rounded-2xl bg-indigo-600 text-white text-[10px] font-black uppercase shadow-lg shadow-indigo-500/20 transition-all active:scale-95"
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
                className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em]"
              >
                Lật thẻ để đánh giá
              </motion.div>
            ) : (
              <motion.div
                  key="voting"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex gap-4 w-full justify-center px-1"
                >
                  {[
                    { id: 1, label: "DỄ", color: "emerald", icon: ThumbsUp, complexity: "easy", colorHex: "#10b981", glow: "rgba(16,185,129,0.4)" },
                    { id: 2, label: "VỪA", color: "amber", icon: Meh, complexity: "medium", colorHex: "#f59e0b", glow: "rgba(245,158,11,0.4)" },
                    { id: 3, label: "KHÓ", color: "rose", icon: ThumbsDown, complexity: "hard", colorHex: "#e11d48", glow: "rgba(225,29,72,0.4)" }
                  ].map((btn) => {
                    const isSelected = userCurrentVote === btn.id;
                    return (
                      <motion.button
                      key={btn.id}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.92 }}
                      initial={false}
                      animate={{
                        scale: isSelected ? 1.08 : 1,
                        backgroundColor: isSelected ? btn.colorHex : "rgba(30, 41, 59, 0.5)",
                        boxShadow: isSelected ? `0 0 20px ${btn.glow}` : "0 0 0 rgba(0,0,0,0)",
                        borderColor: isSelected ? "rgba(255,255,255,0.3)" : "rgba(51, 65, 85, 0.5)"
                      }}
                      transition={{ type: "spring", stiffness: 400, damping: 25 }}
                      onClick={() => handleRate(btn.complexity as Difficulty)}
                      disabled={isVoting || showConfirmModal}
                      className={`flex-1 max-w-[120px] flex flex-col items-center py-3.5 rounded-2xl border transition-colors relative group overflow-hidden ${isSelected ? "text-white" : "text-slate-400 hover:bg-slate-800/80"
                        }`}
                    >
                      <motion.div
                        animate={{ y: isSelected ? -8 : 0 }}
                        transition={{ type: "spring", stiffness: 400, damping: 25 }}
                      >
                        <btn.icon className={`w-5.5 h-5.5 mb-1 ${isSelected ? "" : "group-hover:scale-110 transition-transform"}`} />
                      </motion.div>
                      <span className="text-[10px] font-black uppercase tracking-widest leading-none">{btn.label}</span>
                    </motion.button>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Navigation Controls */}
        <div className="w-full flex items-center justify-between gap-4 px-2">
          <button
            onClick={handlePrev}
            disabled={currentIndex === 0 || showConfirmModal}
            className="p-3.5 rounded-2xl bg-slate-800/50 border border-slate-700/50 text-slate-400 disabled:opacity-20 active:scale-95 transition-all"
          >
            <ChevronLeft className="w-5.5 h-5.5" />
          </button>

          <div className="flex flex-col items-center">
            <span className="text-xl font-black text-slate-100 tabular-nums">
              {currentIndex + 1} <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest ml-1">/ {flashcards.length}</span>
            </span>
          </div>

          <button
            onClick={handleNext}
            disabled={currentIndex === flashcards.length - 1 || showConfirmModal}
            className="p-3.5 rounded-2xl bg-indigo-600 border border-indigo-400/20 text-white shadow-lg shadow-indigo-500/20 disabled:opacity-20 active:scale-95 transition-all text-[10px] font-black uppercase"
          >
            <ChevronRight className="w-5.5 h-5.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
