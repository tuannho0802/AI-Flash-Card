# AI Flashcards Generator - Project Instruction & System Architecture

> **Single Source of Truth** for Developers & AI Agents.
> Last Updated: 2026-02-02

---

## 1. Project Overview & Tech Stack

This project is a modern, AI-powered Flashcard Generator that helps users create study materials instantly using Google's Gemini AI. It leverages the latest web technologies for performance and responsiveness.

### **Core Technologies**

- **Framework**: Next.js 15 (App Router & Server Actions)
- **Language**: TypeScript (Strict Mode)
- **UI Styling**: Tailwind CSS v4 (PostCSS)
  - **Theme**: Dark Blue (#0f172a / `slate-900`)
  - **Effects**: Glassmorphism (`backdrop-blur`), Glow (`shadow-indigo-500/20`), Gradient Borders
- **Animations**: Framer Motion (v12) for 3D flip effects and page transitions
- **Icons**: Lucide React
- **Auth**: Supabase Auth (Email/Password only)
- **Database**: Supabase PostgreSQL

### **AI Infrastructure**

- **Library**: `@google/genai` (v1.39.0+)
- **Model Strategy**:
  - Primary: `gemini-flash-latest` (v1beta)
  - Fallback: `gemini-1.5-flash` -> `gemini-2.0-flash`
- **Parsing**: Manual Regex Extraction (No JSON Mode)

---

## 2. Core Logic & Workflows

### **Authentication Flow (Email/Password)**

1.  **Sign Up**: `/signup` -> `supabase.auth.signUp()`
    - Validates password length (min 6 chars) and confirmation match.
    - Redirects to Login upon success.
2.  **Login**: `/login` -> `supabase.auth.signInWithPassword()`
    - Redirects to Home (`/`) on success.
3.  **Guest vs. User**:
    - **Guest**: `userId` is `null`. Can generate cards but cannot save to DB (or saving is local-only).
    - **User**: `userId` is valid UUID. Can generate and save sets to Supabase.
    - **Logic**: `page.tsx` checks `supabase.auth.getUser()` on mount.

### **Data Flow Architecture**

1.  **Client Input**: User enters topic in `page.tsx`.
2.  **API Request**: POST `/api/generate` with `{ topic }`.
3.  **AI Processing**:
    - Selects Model -> Prompts for Raw JSON -> Manual Regex Parse.
4.  **UI Render**:
    - **Loading**: Show `Loader2` spinner.
    - **Success**: Render `Flashcard` components in 3D Grid.
    - **Error**: Handle 429 (Rate Limit) with countdown or 500 with Toast.

---

## 3. File-by-File Functionality

### **`src/app/api/generate/route.ts` (Backend Logic)**

- **Responsibility**: AI generation.
- **Key Logic**:
  - **Manual Parsing**: Extracts JSON array using `[` and `]` indices to avoid `400 INVALID_ARGUMENT` from strict JSON mode.
  - **Rate Limit Handling**: Returns `{ error: "rate_limit", retryAfter: 30 }`.

### **`src/app/page.tsx` (Frontend Controller)**

- **Responsibility**: Main Dashboard.
- **State**: `topic`, `flashcards`, `mode` (grid/study/list), `userId`.
- **Logic**:
  - **User Check**: `useEffect` calls `supabase.auth.getUser()`.
  - **Mode Switching**: Passes state to `DisplayController`.

### **`src/app/login/page.tsx` & `src/app/signup/page.tsx`**

- **Responsibility**: Authentication.
- **Styling**: Uses `bg-slate-900` global background with `slate-800/50` cards.
- **Validation**: Frontend checks for password matching/length before API call.

---

## 4. Standard Operating Procedures (SOP)

### **Pre-Correction Checklist**

1.  **Analyze Async/Await**: Ensure every `await` is inside an `async` function.
2.  **Verify Imports**: `@google/genai` for AI, `lucide-react` for icons.

### **Post-Correction Checklist**

1.  **Mandatory Lint**: Run `npx tsc --noEmit` immediately after **ANY** code change.
2.  **Verify UI**: Check against Dark Blue Theme (`bg-slate-900`).

### **Model Selection Rules**

1.  **Primary**: `gemini-flash-latest` (on `v1beta`).
2.  **Fallback**: `gemini-1.5-flash`.

---

## 5. Code Quality & Best Practices

### **Tailwind CSS v4**

- **Colors**: Use `slate-900` for backgrounds, `indigo-500` for primary actions.
- **Gradients**: Use `bg-linear-to-*` (v4 syntax).
- **Spacing**: Use `min-h-100` instead of `min-h-[400px]`.

### **Next.js & React**

- **Client Components**: Mark with `"use client"` at the very top.
- **Images**: Use `next/image`.
- **JSX**: Escape apostrophes (`&apos;`).

### **TypeScript**

- **No Any**: Use `unknown` with narrowing or defined Interfaces (`Flashcard`, `FlashcardSet`).
- **Cleanliness**: Remove unused variables (e.g., `router` if not navigating).
- **Variable Declarations**:
  - Always use `const` for variables that are not reassigned.
  - Remember: Arrays and Objects mutated via methods (push, pop) are NOT reassigned, so they should be `const`.
  - **Query Builders**: Supabase query chains that are not conditionally reassigned (e.g., `let query = ...; if(x) query = query.eq(...)`) must be declared as `const`. If you remove the conditional logic, remember to change `let` back to `const`.

### **React Hooks**

- **Effect Dependencies**: When using a function in a `useEffect` dependency array, ALWAYS wrap that function definition in `useCallback` to prevent infinite loops or unnecessary re-renders.
  - *Example*: `useEffect(..., [handleGenerateNew])` requires `const handleGenerateNew = useCallback(...)`.
- **Callback Dependencies**: Ensure all functions used inside `useCallback` are included in the dependency array. If the used function is defined within the component, it must also be wrapped in `useCallback` to maintain referential equality.
  - *Example*: `useCallback(() => shuffleArray(prev), [shuffleArray])`.
