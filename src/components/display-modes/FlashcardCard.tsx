import { useState } from "react";
import { motion } from "framer-motion";
import { Flashcard } from "@/types/flashcard";

interface FlashcardCardProps {
  card: Flashcard;
  index?: number;
  className?: string;
}

export default function FlashcardCard({
  card,
  index = 0,
  className = "",
  isFlipped: controlledFlipped,
  onFlip,
}: FlashcardCardProps & { isFlipped?: boolean; onFlip?: (flipped: boolean) => void }) {
  const [localFlipped, setLocalFlipped] = useState(false);
  const isFlipped = controlledFlipped !== undefined ? controlledFlipped : localFlipped;

  const handleFlip = () => {
    const nextState = !isFlipped;
    if (onFlip) onFlip(nextState);
    else setLocalFlipped(nextState);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        delay: index * 0.05,
        duration: 0.4,
      }}
      className={`perspective-1000 w-full h-64 cursor-pointer group ${className}`}
      onClick={handleFlip}
      whileHover={{ y: -8 }}
    >
      <motion.div
        className="relative w-full h-full"
        initial={false}
        animate={{
          rotateY: isFlipped ? 180 : 0,
        }}
        transition={{
          duration: 0.6,
          type: "spring",
          stiffness: 260,
          damping: 20,
        }}
        style={{
          transformStyle: "preserve-3d",
        }}
      >
        {/* Front */}
        <div className="absolute w-full h-full backface-hidden bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 flex items-center justify-center p-6 text-center group-hover:shadow-xl transition-shadow duration-300">
          <div className="flex flex-col items-center gap-2">
            <span className="text-xs uppercase tracking-wider text-gray-400 font-semibold">
              Question
            </span>
            <p className="text-lg font-medium text-gray-800 dark:text-gray-100">
              {card.front}
            </p>
          </div>
        </div>

        {/* Back */}
        <div
          className="absolute w-full h-full backface-hidden bg-linear-to-br from-indigo-50 to-blue-100 dark:from-indigo-900/40 dark:to-blue-900/40 rounded-xl shadow-md border border-indigo-200 dark:border-indigo-800 flex items-center justify-center p-6 text-center"
          style={{
            transform: "rotateY(180deg)",
          }}
        >
          <div className="flex flex-col items-center gap-2">
            <span className="text-xs uppercase tracking-wider text-indigo-400 dark:text-indigo-300 font-semibold">
              Answer
            </span>
            <p className="text-lg font-medium text-indigo-900 dark:text-indigo-100">
              {card.back}
            </p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
