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
2.  **Autonomous Classification**: AI-generated text categories are processed via `resolveCategoryId`.
    -   **Semantic Mapping**: Uses `getBestIcon(name)` from `categoryUtils.ts` to assign icons based on 50+ keywords.
    -   **Auto-Translation**: English category names are automatically translated to Vietnamese (e.g., *Math* -> *Toán học*).
3.  **Model Rotation**: On 429 Errors, the system rotates through: `2.0-flash-lite` -> `1.5-flash` -> `1.5-pro`.
4.  **Smart UI**: `CategoryBadge.tsx` uses the synchronized `category_id` to render the official icon/color from DB. Fallback to `LayoutGrid` (slate) if unlinked.

---

## 3. RBAC & Security Architecture

### **Authorization Policy**
- **Unified Guard**: `if (profile?.role !== 'admin') return 401/403`. 
- **Admin Portal**: Secret administrative tools (Backfill, Merge) are containerized in the **Admin Tab**.
- **Instant Access**: Toggle admin view with `Shift + M`.

### **Admin UI Standards**
- **Visibility**: Admin-only icons (like Category Edit ✏️) are gated by `isAdmin` state.
- **Backfill Safety**: API implemented with manual delay (7s) and immediate stop on quota exhaustion.

### **Schema Reference: `categories` table**
- `id`: UUID (Primary Key)
- `name`: TEXT (Unique, e.g., 'Công nghệ')
- `slug`: TEXT (Unique, e.g., 'cong-nghe')
- `icon`: TEXT (Lucide icon name, e.g., 'Code')
- `color`: TEXT (Tailwind color key, e.g., 'blue')

### **Schema Reference: `flashcard_votes` table**
- `user_id`: UUID (Foreign Key -> `auth.users.id`)
- `set_id`: UUID (Foreign Key -> `flashcard_sets.id`)
- `card_index`: INTEGER (Index of the card in the set)
- `rating`: INTEGER (1: DỄ, 2: VỪA, 3: KHÓ)
- `created_at`: TIMESTAMPTZ

### **Schema Reference: `flashcard_difficulty_stats` (View)**
- `set_id`, `card_index`: Composite Key identifiers.
- `total_votes`: BigInt (Total number of votes).
- `easy_count`, `medium_count`, `hard_count`: Counts per rating.
- `avg_rating`: DECIMAL (Weighted average).

---

## 4. Standard Operating Procedures (SOP)

### **Pre-Correction Checklist**
1.  **Normalization**: Ensure all topic-based queries use `.ilike()` for case-insensitivity.
2.  **Strict Typing**: Interfaces (`Flashcard`, `FlashcardSet`, `Profile`) must be strictly followed.
3.  **Zero-Overlap Check**: Ensure the UI fits in `h-[calc(100vh-OFFSET)]` with `overflow-hidden` on roots.
4.  **Vietnamese Typography**: **Cấm tuyệt đối italic** cho các nhãn Tiếng Việt. Sử dụng `font-sans` và `font-black`.

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
