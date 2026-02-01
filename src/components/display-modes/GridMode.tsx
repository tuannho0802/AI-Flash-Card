import { Flashcard } from "@/types/flashcard";
import FlashcardCard from "./FlashcardCard";

interface GridModeProps {
  flashcards: Flashcard[];
}

export default function GridMode({ flashcards }: GridModeProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 w-full max-w-7xl mx-auto">
      {flashcards.map((card, index) => (
        <FlashcardCard key={index} card={card} index={index} />
      ))}
    </div>
  );
}
