# React Composition Patterns (AI Flashcards Edition)

Patterns for scalable React components within the AI Flashcards project.

## When to use

- Refactoring `page.tsx` to reduce complexity.
- Building reusable UI controls like `DisplayController`.
- Managing complex state like Flashcard sets.

## Core Patterns used in Project

### 1. Controlled Components (State Hoisting)

- **Usage**: `DisplayController` in `src/components/DisplayController.tsx`.
- **Pattern**: The parent (`page.tsx`) owns the state (`mode`), and the child receives the value and a change handler.
- **Example**:

  ```tsx
  // Parent (page.tsx)
  const [mode, setMode] =
    useState<DisplayMode>("grid");

  return (
    <DisplayController
      currentMode={mode}
      onModeChange={setMode}
    />
  );

  // Child (DisplayController.tsx)
  interface Props {
    currentMode: DisplayMode;
    onModeChange: (mode: DisplayMode) => void;
  }
  ```

### 2. Component Slot / Mode Switching

- **Usage**: Switching between `GridMode`, `StudyMode`, and `ListMode` in `page.tsx`.
- **Pattern**: Conditional rendering based on state, keeping the "Shell" (Header, Footer, Input) constant.
- **Example**:
  ```tsx
  {
    loading ? (
      <LoadingState />
    ) : (
      <>
        {mode === "grid" && (
          <GridMode flashcards={flashcards} />
        )}
        {mode === "study" && (
          <StudyMode flashcards={flashcards} />
        )}
        {mode === "list" && (
          <ListMode flashcards={flashcards} />
        )}
      </>
    );
  }
  ```

### 3. Layout Composition (Server vs Client)

- **Usage**: `layout.tsx` (Server) wrapping `children`.
- **Pattern**: Keep `layout.tsx` as a Server Component for SEO and metadata, while children (`page.tsx`) can be Client Components.
- **Rule**: Do not add `"use client"` to `layout.tsx` unless absolutely necessary (e.g., for a global Context Provider that requires hooks).

### 4. Container/Presentation Separation

- **Target Refactor**: `Flashcard.tsx` handles both display and flip logic.
- **Future Goal**: Split into `FlashcardContainer` (flip state) and `FlashcardView` (rendering) if logic grows complex.
