# AI Flashcards Generator - Project Instruction & System Architecture

> **Single Source of Truth** for Developers & AI Agents.
> Last Updated: 2026-02-11

---

## 1. Project Overview & Tech Stack

This project is a modern, AI-powered Flashcard Generator that helps users create study materials instantly using Google's Gemini AI.

### **Core Technologies**
- **Framework**: Next.js 15 (App Router & Server Actions)
- **Language**: TypeScript (Strict Mode)
- **UI Styling**: Tailwind CSS v4 (PostCSS)
  - **Theme**: Dark Blue (`#0f172a / slate-900`)
  - **Effects**: Glassmorphism (`backdrop-blur`), Glow (`shadow-indigo-500/20`), Gradient Borders
- **Animations**: Framer Motion (v12) for 3D flip effects and transitions
- **Auth & DB**: Supabase (PostgreSQL + Auth)
- **AI Infrastructure**: `@google/genai` (v1.39.0+, `gemini-flash-latest`)

---

## 2. Core Logic & Workflows

### **Authentication & Database Sync**
1.  **Sign Up**: `/signup` -> `supabase.auth.signUp()`
    - **Trigger Sync**: `public.profiles` is created via PostgreSQL trigger. **Do NOT** write frontend logic to create profiles.
2.  **Login**: `/login` -> `supabase.auth.signInWithPassword()`
3.  **Guest vs. User**:
    - **Guest**: `userId` is `null`. Local-only generation.
    - **User**: `userId` is UUID. Can save sets to Supabase.
4.  **RBAC**: Roles (`admin`, `user`) are stored in `profiles.role`.

### **Data Flow Architecture**
1.  **Client Request**: POST `/api/generate` with `{ topic }` and optional `{ quantity }`.
2.  **Normalization**: POST `/api/normalize` to ensure consistent topic keys (e.g., "Python Programming").
3.  **AI Extraction**: Manual Regex Extraction of JSON array (v1.5/2.0-flash).
4.  **Display**: 3D Grid render with `Framer Motion`. 429 errors handled with cooldown.

---

## 3. RBAC & Security Architecture

### **Authorization Policy**
- **Server-Side Guard**: All administrative or sensitive API routes (e.g., `/api/admin/merge`) **MUST** verify the user's role from the `profiles` table on the server side.
- **Rule**: `if (profile?.role !== 'admin') return 403 Forbidden`.

### **Admin UI Standards**
- **Access**: Admin tools are housed in the Admin Sidebar, toggled via `Shift + M`.
- **Visibility**: Admins see a glowing "ADMIN" badge in the `Navbar`.
- **Consistency**: Maintain glassmorphism and `framer-motion` for all admin panels.

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
