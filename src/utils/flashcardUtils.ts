/**
 * Utility functions for flashcard data management.
 */

import { Flashcard } from "@/types/flashcard";

/**
 * Normalizes a string for semantic comparison.
 * Converts to lowercase, removes extra spaces, and strips basic punctuation.
 */
export function normalizeFrontText(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "") // Remove punctuation
    .replace(/\s{2,}/g, " "); // Replace multiple spaces with a single space
}

/**
 * Smartly merges two sets of flashcards.
 * Deduplicates by normalized front text, keeping the one with the more detailed back.
 */
export function smartMergeCards(existingCards: Flashcard[], newCards: Flashcard[]): Flashcard[] {
  const cardsMap = new Map<string, Flashcard>();

  // Process all cards
  const allCards = [...existingCards, ...newCards];

  allCards.forEach((card) => {
    if (!card.front || !card.back) return;

    const normalizedKey = normalizeFrontText(card.front);
    const existing = cardsMap.get(normalizedKey);

    if (existing) {
      // If duplicate found, keep the one with the longer/more detailed back
      if (card.back.length > existing.back.length) {
        cardsMap.set(normalizedKey, card);
      }
    } else {
      cardsMap.set(normalizedKey, card);
    }
  });

  return Array.from(cardsMap.values());
}

/**
 * Sanitizes flashcard data to ensure it's a valid JSON array of objects.
 */
export function sanitizeFlashcards(cards: any): Flashcard[] {
  if (!Array.isArray(cards)) return [];
  
  return cards.filter((card): card is Flashcard => {
    return (
      card !== null &&
      typeof card === "object" &&
      typeof card.front === "string" &&
      typeof card.back === "string"
    );
  });
}
