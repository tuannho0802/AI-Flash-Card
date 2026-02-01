import { Flashcard } from "@/types/flashcard";
import { motion } from "framer-motion";

interface ListModeProps {
  flashcards: Flashcard[];
}

export default function ListMode({
  flashcards,
}: ListModeProps) {
  return (
    <div className="w-full max-w-4xl mx-auto space-y-4">
      {flashcards.map((card, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
          className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 flex flex-col md:flex-row gap-6 hover:border-blue-300 dark:hover:border-blue-700 transition-colors"
        >
          <div className="flex-1">
            <span className="text-xs font-bold text-gray-400 uppercase mb-2 block tracking-wider">
              Question {index + 1}
            </span>
            <p className="text-lg text-gray-800 dark:text-gray-200 font-medium leading-relaxed">
              {card.front}
            </p>
          </div>

          <div className="hidden md:block w-px bg-linear-to-b from-transparent via-gray-200 dark:via-gray-700 to-transparent self-stretch"></div>

          <div className="flex-1">
            <span className="text-xs font-bold text-blue-500 uppercase mb-2 block tracking-wider">
              Answer
            </span>
            <p className="text-lg text-gray-600 dark:text-gray-400 leading-relaxed">
              {card.back}
            </p>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
