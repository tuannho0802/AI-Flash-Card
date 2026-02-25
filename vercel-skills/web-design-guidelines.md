# Web Design & UI Guidelines (AI Flashcards Edition)

Design system and visual standards for the Dark Blue aesthetic.

## 1. Color Palette (Dark Blue Theme)

### **Backgrounds**
- **Global Background**: `bg-slate-900` (#0f172a) - The deep blue/black base.
- **Cards/Containers**: `bg-slate-800/50` - Slightly lighter, with 50% opacity for glass effect.
- **Inputs**: `bg-slate-900/50` - Deep recess for data entry.

### **Primary Accents**
- **Brand Color**: `indigo-500` (#6366f1).
- **Hover States**: `indigo-400` or `indigo-600`.
- **Glow Effects**: `shadow-indigo-500/20`.

### **Text Hierarchy**
- **Headings**: `text-white` or `text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400`.
- **Body**: `text-slate-300` (High readability on dark).
- **Muted**: `text-slate-500` (Placeholders, labels).
- **Error**: `text-red-400`.

## 2. UI Components & Effects

### **Glassmorphism**
- **Standard**: `backdrop-blur-sm` or `backdrop-blur-md`.
- **Border**: `border border-slate-700/50` (Subtle separation).

### **Gradients (Tailwind v4)**
- **Syntax**: Use `bg-linear-to-r` (e.g., `bg-linear-to-r from-indigo-500 to-cyan-500`).
- **Usage**: Primary Buttons, Title Text, Flashcard Backs.

### **Focus States**
- **Rule**: All interactive elements must have a visible focus ring.
- **Style**: `focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500`.

## 3. Accessibility (a11y)

### **Contrast**
- Ensure `text-slate-300` or lighter is used on `slate-900` backgrounds.
- Avoid `text-slate-600` on dark backgrounds (too low contrast).

### **Interactive Elements**
- **Buttons**: Must have `min-h-[44px]` for touch targets.
- **Keyboard**: Flashcards must be flip-able via `Enter` or `Space` (Implement `onKeyDown` handlers).

## 4. Typography
- **Font Family**: Geist Sans (Next.js default) or Inter.
- **Scale**:
  - `text-4xl`/`text-5xl`: Main Landing Title.
  - `text-2xl`: Section Headers / Auth Titles.
  - `text-sm`/`text-base`: Body text.
## 5. Layout & Navigation Patterns

### **AppShell Architecture**
- **Desktop**: Persistent side-navigation (`AppSidebar`) with transition width (`64px` to `224px`).
- **Main Content**: `overflow-y-auto` with restricted height (`h-screen`) to prevent global scrollbars.
- **Glassmorphism**: Sidebar must use `bg-slate-900/70` with `backdrop-blur-xl` for depth.

### **Interactive Navigation**
- **Active State**: Use `bg-indigo-500/20 text-indigo-300 border-indigo-500/30` for active nav items.
- **Admin Items**: Use `bg-amber-500/20 text-amber-300 border-amber-500/30` for admin management tabs.
- **Micro-interactions**: Use spring-based animations for sidebar width and drawer entry/exit.
