# AI Flashcards Generator - Project Instruction & System Architecture

> **Single Source of Truth** for Developers & AI Agents.
> Last Updated: 2026-02-01

---

## 1. Project Overview & Tech Stack

This project is a modern, AI-powered Flashcard Generator that helps users create study materials instantly using Google's Gemini AI. It leverages the latest web technologies for performance and responsiveness.

### **Core Technologies**
- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **UI Styling**: Tailwind CSS v4 (PostCSS)
- **Animations**: Framer Motion (v12) for 3D flip effects
- **Icons**: Lucide React
- **React Compiler**: Enabled via `babel-plugin-react-compiler`

### **AI Infrastructure**
- **Library**: `@google/genai` (v1.39.0+) - The official, latest SDK from Google.
- **Why this library?**: The older `google-generative-ai` package is being phased out. The new `@google/genai` SDK offers better support for modern Gemini models (2.0+) and improved type definitions, though it requires strict adherence to its response access patterns (property access `result.text` vs method `result.text()`).

---

## 2. Core Logic & Workflows

### **Data Flow Architecture**
1.  **Client Input**: User enters a topic in `page.tsx` and presses Enter/Click.
2.  **API Request**: Client sends a `POST` request to `/api/generate` with `{ topic: string }`.
3.  **AI Processing (Server)**:
    *   Initialize `GoogleGenAI` client with API Key.
    *   **CRITICAL**: Use `apiVersion: 'v1beta'` to access the latest model aliases.
    *   **CRITICAL**: Use model `gemini-flash-latest` (or `gemini-1.5-flash` if available) to ensure stability and avoid 2.0-flash rate limits.
    *   Send prompt with strict instruction: "Return ONLY a raw JSON array".
4.  **Manual Parsing (The "Anti-Fragile" Layer)**:
    *   Receive raw text response from Gemini.
    *   **Clean**: Remove markdown code blocks (` ```json `, ` ``` `).
    *   **Extract**: Use `indexOf('[')` and `lastIndexOf(']')` to isolate the JSON array.
    *   **Parse**: `JSON.parse()` the extracted string.
5.  **Response**: Return JSON data to Client.
6.  **UI Render**: Client parses response; handles success (render Grid) or error (show Toast/Alert).

### **Why Manual Parsing?**
We deliberately avoided the SDK's built-in `responseMimeType: 'application/json'` (JSON Mode) because:
1.  **Version Incompatibility**: It causes `400 INVALID_ARGUMENT` errors on `apiVersion: 'v1'` with certain models.
2.  **Model Availability**: Some "Flash" models in Free Tier do not strictly support JSON Mode constraints.
3.  **Robustness**: Manual parsing via Regex/Slice is "model-agnostic"—it works as long as the AI outputs valid text, regardless of API version quirks.

---

## 3. File-by-File Functionality

### **`src/app/api/generate/route.ts` (Backend Logic)**
- **Responsibility**: Handle AI generation requests.
- **Key Logic**:
    - **Model Selection**: Defaults to `gemini-flash-latest` on `v1beta`.
    - **Error Handling**: 
        - Catches `429 Resource Exhausted`.
        - Returns structured error: `{ error: "rate_limit", retryAfter: 30 }`.
    - **Parsing**: Implements the "Manual Parsing" logic described above.

### **`src/app/page.tsx` (Frontend Controller)**
- **Responsibility**: Main UI, State Management.
- **Key Features**:
    - **State**: `topic` (input), `flashcards` (data), `loading` (spinner), `error` (feedback), `countdown` (429 timer).
    - **Error UI**: 
        - **Yellow Alert**: For `429 Rate Limit` errors with a real-time countdown timer.
        - **Red Alert**: For generic 500/Network errors.
    - **Hooks**: Uses `useEffect` to manage the countdown timer.

### **`src/components/Flashcard.tsx` (UI Component)**
- **Responsibility**: Single flashcard display.
- **Visuals**: 
    - **3D Flip**: Uses `framer-motion` with `rotateY` and `perspective-1000`.
    - **Styling**: Gradient backgrounds, rounded corners, shadow effects.
    - **Accessibility**: Support for keyboard navigation (Enter/Space to flip).

---

## 4. Standard Operating Procedures (SOP) for AI Agent

### **Pre-Correction Checklist (Do NOT skip)**
1.  **Analyze Async/Await**: Ensure every `await` is inside an `async` function.
2.  **Verify Braces**: Check for matching `{}` and `()` before editing, especially in nested `try-catch` blocks.
3.  **Check Imports**: Ensure `@google/genai` is imported correctly, and React hooks are imported from `react`.

### **Post-Correction Checklist**
1.  **Mandatory Lint**: Run `npx tsc --noEmit` immediately after **ANY** code change.
    - *Goal*: Zero Syntax Errors, Zero Type Mismatches.
2.  **Verify UI**: If logic touches UI, check for `className` conflicts or Tailwind 4 syntax validity.

### **Model Selection Rules**
1.  **Primary**: `gemini-flash-latest` (on `v1beta`).
2.  **Secondary**: `gemini-1.5-flash` (on `v1beta`).
3.  **Fallback**: `gemini-2.0-flash` (Only if 1.5 is unavailable AND `v1` is required, but beware of Rate Limits).
4.  **Prohibited**: Do not use `gemini-pro` or `gemini-ultra` unless explicitly requested (Cost/Latency concerns).

---

## 5. Debugging & Expansion Guide

### **Handling 429 Errors (Quota Exceeded)**
- **Symptom**: Logs show `status: 429` or `RESOURCE_EXHAUSTED`.
- **Immediate Action**: 
    1.  Check `page.tsx` logic: Is the countdown timer triggering?
    2.  Wait 30-60 seconds.
    3.  If persistent, switch API Key or rotate Model (e.g., from `flash` to `flash-lite` if available).

### **Future Roadmap**
1.  **Supabase Integration**: Persist flashcards to a database so users can save/review later.
2.  **Export PDF**: Use `jspdf` to generate printable flashcards.
3.  **User Auth**: Add `Clerk` or `NextAuth` for personalized user sessions.

---

## 6. Code Quality & Best Practices (Warnings & Pitfalls)

### **Tailwind CSS v4 Preferences**
- **Linear Gradients**: Use `bg-linear-to-*` instead of the legacy `bg-gradient-to-*` syntax.
- **Flexbox**: Use `shrink-0` instead of `flex-shrink-0`.
- **Custom Spacing**: Use `min-h-100` (or similar custom values) instead of arbitrary values like `min-h-[400px]` where possible for consistency.

### **Next.js & React Best Practices**
- **Images**: Always use the `<Image />` component from `next/image` instead of the standard `<img>` tag to optimize performance and prevent LCP warnings.
  - *Note*: For local blob URLs or dynamic external images, add `unoptimized` or configure `next.config.ts` accordingly.
- **JSX Special Characters**: Always escape apostrophes and special characters (e.g., use `&apos;` instead of `'`) to avoid JSX parsing errors.
- **React Hooks**: Always include all dependencies in `useEffect` and `useCallback` dependency arrays. Use `useCallback` to memoize functions passed as dependencies.

### **TypeScript & Linting**
- **Type Safety**: Avoid `any` at all costs. Use explicit interfaces (e.g., `FlashcardSet`) or `unknown` with type narrowing.
- **Unused Variables**: Remove all unused variables. If a variable is required by a function signature but unused, prefix it with `_` (e.g., `_event`).
