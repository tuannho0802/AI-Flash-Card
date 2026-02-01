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
} from "lucide-react";
import {
  motion,
  AnimatePresence,
} from "framer-motion";

interface StudyModeProps {
  flashcards: Flashcard[];
}

export default function StudyMode({
  flashcards,
}: StudyModeProps) {
  const [currentIndex, setCurrentIndex] =
    useState(0);

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

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (
      e: KeyboardEvent,
    ) => {
      if (e.key === "ArrowRight") handleNext();
      if (e.key === "ArrowLeft") handlePrev();
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
  }, [handleNext, handlePrev]);

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
            />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-8 mt-10">
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
