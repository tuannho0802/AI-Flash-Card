# AI Flashcards Generator - Project Instruction & System Architecture

> **Single Source of Truth** for Developers & AI Agents.
> Last Updated: 2026-02-11

---

## 1. Project Overview & Tech Stack

This project is a modern, AI-powered Flashcard Generator that helps users create study materials instantly using Google's Gemini AI.

### **Core Technologies**
- **Framework**: Next.js 15 (App Router & Server Actions)
- **Language**: TypeScript (Strict Mode)
### **Core Technologies**
- **Framework**: Next.js 15 (App Router, AppShell Layout)
- **UI Styling**: Tailwind CSS v4 (PostCSS)
  - **Theme**: Dark Blue (`#0f172a / slate-900`)
  - **Structural Components**: `AppSidebar.tsx` (Glassmorphic, Collapsible)
- **Animations**: Framer Motion (v12) for Layout transitions and 3D card flips
- **AI Infrastructure**: `@google/genai` (v1beta, Multi-model fallback rotation)

---

## 2. Core Logic & Architecture

### **AppShell Layout**
1.  **Sidebar**: `AppSidebar` handles primary navigation (Home, Analytics, Library, Admin).
2.  **Stateful Tabs**: The main application uses a `activeTab` state to switch views without page reloads.
3.  **Collapsible Mode**: Desktop sidebar can be toggled via `isCollapsed` state (persisted in `localStorage`).

### **Data Flow & AI**
1.  **Generation**: POST `/api/generate`. Prompts include `userCategory` for hybrid classification.
2.  **Model Rotation**: On 429 Errors, the system rotates through: `2.0-flash-lite` -> `1.5-flash` -> `1.5-pro`.
3.  **Smart UI**: `getCategoryColor(category)` utility maps topics to specific color themes (e.g., Programming -> Blue).

---

## 3. RBAC & Security Architecture

### **Authorization Policy**
- **Unified Guard**: `if (profile?.role !== 'admin') return 401/403`. 
- **Admin Portal**: Secret administrative tools (Backfill, Merge) are containerized in the **Admin Tab**.
- **Instant Access**: Toggle admin view with `Shift + M`.

### **Admin UI Standards**
- **Visibility**: Admin-only icons (like Category Edit ✏️) are gated by `isAdmin` state.
- **Backfill Safety**: API implemented with manual delay (7s) and immediate stop on quota exhaustion.

### **Schema Reference: `profiles` table**
- `id`: UUID (Primary Key, matches `auth.users.id`)
- `role`: TEXT (Default: 'user', Values: 'admin', 'user')
- `full_name`: TEXT (Nullable)
- `email`: TEXT (Nullable)

---

## 4. Standard Operating Procedures (SOP)

### **Pre-Correction Checklist**
1.  **Normalization**: Ensure all topic-based queries use `.ilike()` for case-insensitivity.
2.  **Strict Typing**: Interfaces (`Flashcard`, `FlashcardSet`, `Profile`) must be strictly followed.

### **Post-Correction Checklist**
1.  **Mandatory Lint**: Run `npx tsc --noEmit` after **ANY** change.
2.  **Admin Check**: Ensure no sensitive tools are visible to `role: 'user'`.

---

## 5. Code Quality & Best Practices

### **Tailwind CSS v4**
- **Colors**: Use `slate-900` for backgrounds, `indigo-500` for primary actions.
- **Syntax**: `bg-linear-to-*` for gradients, `min-h-100` for fixed heights.

### **React & TypeScript**
- **Hooks**: Wrap effect dependencies in `useCallback` to prevent infinite loops.
- **Hydration**: Verify mount state before rendering LocalStorage-derived content.
- **Variables**: Use `const` unless reassignment is strictly necessary.
- **Error UI**: Never show raw JSON errors. Use friendly banners or toasts.
