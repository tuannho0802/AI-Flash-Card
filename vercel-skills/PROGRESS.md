# AI Flashcards - Project Progress & Technical Logs

## 🚀 Accomplishments & Milestones

### **Done**
- [x] **Sidebar Navigation**: Professional AppShell layout with glassmorphic sidebar and collapsible (3-bar) functionality.
- [x] **Admin RBAC System**: Role-based access control allowing only admins to access management tools (Backfill, Merge).
- [x] **Analytics Dashboard**: Real-time statistics including total cards, category distribution charts, and AI model list.
- [x] **Smart Badge Logic**: `getCategoryColor` utility function for dynamic, color-coded topic labels.
- [x] **Multi-Model Fallback**: Intelligent rotation from `2.0-flash-lite` -> `1.5-flash` -> `1.5-pro` on quota errors.
- [x] **Admin Hotkey**: `Shift + M` integration to instantly open the Admin management portal.
- [x] **Public Library**: Specialized view for system-wide flashcard sets.
- [x] **Autonomous Category System**: Intelligent classification engine with semantic icon mapping (50+ icons), auto-translation, and database synchronization.
- [x] **Community Voting System**: Real-time difficulty rating (Easy/Medium/Hard) with aggregated community statistics.
- [x] **Study Mode Premium**: Zero-overlap layout with fixed viewports, high-fidelity spring animations, and optimized Vietnamese typography.

### **In Progress**
- [ ] **Flashcard Export**: PDF/Markdown export for offline study.
- [ ] **Collaborative Sets**: Multi-user editing for shared study groups.

---

## 🛠️ Technical Logs & Solutions

### **1. Solving the "Nested Button" Hydration Error**
- **Problem**: React warnings and hydration mismatches caused by `<button>` elements nested inside other `<button>` elements (e.g., Edit icon inside a History Card).
- **Solution**: 
    - Replaced the outer `<button>` in `HistoryCard` with a `<div>`.
    - Added `cursor-pointer` and `hover` effects manually via Tailwind.
    - Used `e.stopPropagation()` on the inner action buttons (Edit/Favorite) to prevent event bubble-up to the card's main click handler.
- **Outcome**: 100% clean console and successful `npm run build`.

### **2. 429 & 502 Stability Architecture**
- **Problem**: Frequent "Resource Exhausted" (429) errors from Gemini Free Tier and occasional "Bad Gateway" (502) on Vercel during long streams.
- **Solution**:
    - **Rotation**: Implemented `FALLBACK_MODELS` array. On error, the system waits 2s and rotates to the next model.
    - **Delay**: Added a mandatory **7-second sleep** between iterations in the Backfill API to stay under the Requests Per Minute (RPM) limit.
    - **Auth**: Enabled session-based authentication for Admin APIs to allow direct triggers from the UI without exposing secrets.

### **3. Mobile-First Navigation**
- **Architecture**: Used a dual-navigation approach:
    - **Desktop**: Persistent `AppSidebar` with spring-based Framer Motion transitions.
    - **Mobile**: Collapses to a `Menu` icon top-bar and a slide-in `AnimatePresence` drawer.
### **4. Autonomous Category Intelligence**
- **Problem**: Inconsistent category labels (e.g., 'Science' vs 'Khoa học') and generic icons (Tag/LayoutGrid) across thousands of user-generated sets.
- **Solution**:
    - **Utility Architecture**: Created `categoryUtils.ts` as the central engine for normalization, slug generation, and semantic mapping.
    - **Semantic Engine**: Implemented `getBestIcon` using regex-based keyword matching for 50+ Lucide icons, prioritizing specific topics (Rocket, Beaker, Banknote).
    - **Migration API**: Developed a robust synchronizer that audits existing records, creates missing categories on-the-fly, and 'polishes' metadata (translating English names and upgrading icons).
- **Result**: Data integrity is maintained automatically during AI generation and history browsing. All sets now feature professional, semantically-correct visuals.
### **5. Flashcard Flip Stability (Zero-Jitter)**
- **Problem**: Flashcards would "jump" or shift slightly during 3D rotations due to browser layout recalculations.
- **Solution**: 
    - Forced **Absolute Anchoring** using `absolute inset-0 top-0 left-0`.
    - Locked container heights to prevent "growth" when secondary face content was longer.
- **Outcome**: 100% static positioning during transitions.

### **6. Framer Motion "Invariant Keyframes" Fix**
- **Problem**: React error: "Only two keyframes currently supported with spring" when using arrays like `[1, 1.4, 1]` with `type: "spring"`.
- **Solution**: Removed the array notation. Shared a standardized physics config (`stiffness: 400, damping: 25`) and let the spring handle the oscillation to the target value.
- **Outcome**: Smooth, crash-free "premium" feel.
