import { useState, useEffect, useCallback } from "react";

export type Difficulty = "easy" | "medium" | "hard";

export interface ProgressData {
  difficulty: Difficulty;
  lastReview: number;
}

export interface LearningProgress {
  [cardFront: string]: ProgressData;
}

const STORAGE_KEY = "ai-flashcards-progress";

export function useLearningProgress() {
  const [progress, setProgress] = useState<LearningProgress>({});
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setProgress(JSON.parse(stored));
      }
    } catch (error) {
      console.error("Failed to load learning progress:", error);
    }
  }, []);

  const markAs = useCallback(
    (cardFront: string, difficulty: Difficulty) => {
      setProgress((prev) => {
        const newProgress = {
          ...prev,
          [cardFront]: {
            difficulty,
            lastReview: Date.now(),
          },
        };
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(newProgress));
        } catch (error) {
          console.error("Failed to save learning progress:", error);
        }
        return newProgress;
      });
    },
    []
  );

  const getProgress = useCallback(
    (cardFront: string): ProgressData | undefined => {
      return progress[cardFront];
    },
    [progress]
  );

  return {
    progress,
    markAs,
    getProgress,
    isMounted,
  };
}
