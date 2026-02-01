"use client";

import { useState } from "react";
import { motion } from "framer-motion";

interface FlashcardProps {
  front: string;
  back: string;
}

export default function Flashcard({
  front,
  back,
}: FlashcardProps) {
  const [isFlipped, setIsFlipped] =
    useState(false);
  const [isAnimating, setIsAnimating] =
    useState(false);

  const handleFlip = () => {
    if (!isAnimating) {
      setIsFlipped(!isFlipped);
      setIsAnimating(true);
    }
  };

  return (
    <div
      className="h-62.5 w-full cursor-pointer perspective-1000 outline-none"
      onClick={handleFlip}
      onKeyDown={(e) => {
        if (
          e.key === "Enter" ||
          e.key === " "
        ) {
          e.preventDefault();
          handleFlip();
        }
      }}
      role="button"
      tabIndex={0}
      aria-label="Flip flashcard"
    >
      <motion.div
        className="relative h-full w-full text-center transition-all duration-500 transform-style-3d"
        initial={false}
        animate={{
          rotateY: isFlipped ? 180 : 0,
        }}
        transition={{ duration: 0.6 }}
        onAnimationComplete={() =>
          setIsAnimating(false)
        }
      >
        {/* Front Face */}
        <div className="absolute inset-0 flex flex-col items-center justify-center rounded-xl bg-white p-6 shadow-xl backface-hidden border-2 border-gray-100 dark:bg-gray-800 dark:border-gray-700">
          <h3 className="text-xl font-bold text-gray-800 dark:text-white">
            Question
          </h3>
          <p className="mt-4 text-lg text-gray-600 dark:text-gray-300">
            {front}
          </p>
        </div>

        {/* Back Face */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-center rounded-xl bg-linear-to-br from-blue-500 to-purple-600 p-6 shadow-xl backface-hidden text-white"
          style={{
            transform: "rotateY(180deg)",
          }}
        >
          <h3 className="text-xl font-bold border-b border-white/30 pb-2 mb-2">
            Answer
          </h3>
          <p className="text-lg font-medium">
            {back}
          </p>
        </div>
      </motion.div>
    </div>
  );
}
