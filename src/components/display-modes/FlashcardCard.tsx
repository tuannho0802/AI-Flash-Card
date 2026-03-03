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
  isCompact = false,
}: FlashcardCardProps & {
  isFlipped?: boolean;
  onFlip?: (flipped: boolean) => void;
  isCompact?: boolean;
}) {
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
      className={`perspective-1000 w-full ${isCompact ? "h-full" : "h-64"} cursor-pointer group ${className}`}
      onClick={handleFlip}
      whileHover={isCompact ? undefined : { y: -8 }}
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
        <div className="absolute w-full h-full backface-hidden bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 flex flex-col p-4 text-center group-hover:shadow-xl transition-shadow duration-300">
          <div className="flex flex-col h-full">
            <span className={`text-xs uppercase tracking-wider ${isCompact ? "text-slate-400 font-bold mb-2" : "text-gray-400 font-semibold mb-2"}`}>
              {isCompact ? "CÂU HỎI" : "Question"}
            </span>
            <div className={`flex-1 flex items-center justify-center ${isCompact ? "overflow-y-auto custom-scrollbar px-2" : ""}`}>
              <p className={`${isCompact ? "text-xl font-bold" : "text-lg font-medium"} text-gray-800 dark:text-gray-100 leading-tight`}>
                {card.front}
              </p>
            </div>
          </div>
        </div>

        {/* Back */}
        <div
          className="absolute w-full h-full backface-hidden bg-linear-to-br from-indigo-50 to-blue-100 dark:from-indigo-900/40 dark:to-blue-900/40 rounded-xl shadow-md border border-indigo-200 dark:border-indigo-800 flex flex-col p-4 text-center"
          style={{
            transform: "rotateY(180deg)",
          }}
        >
          <div className="flex flex-col h-full">
            <span className={`text-xs uppercase tracking-wider ${isCompact ? "text-indigo-500 dark:text-indigo-400 font-bold mb-2" : "text-indigo-400 dark:text-indigo-300 font-semibold mb-2"}`}>
              {isCompact ? "TRẢ LỜI" : "Answer"}
            </span>
            <div className={`flex-1 flex items-center justify-center ${isCompact ? "overflow-y-auto custom-scrollbar px-2" : ""}`}>
              <p className={`${isCompact ? "text-xl font-bold" : "text-lg font-medium"} text-indigo-900 dark:text-indigo-100 leading-tight`}>
                {card.back}
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
