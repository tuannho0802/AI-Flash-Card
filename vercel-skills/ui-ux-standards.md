# UI/UX & Technical Standards (Source of Truth)

This document defines the core visual and interaction standards for the AI Flashcards project, specifically focusing on the refinements made for Study Mode and Focus Mode.

## 1. Zero-Overlap Layout (Static Viewport)

All interactive modes (Study, Focus, etc.) must follow a "Zero-Overlap" architecture to ensure consistency across different screen sizes and content lengths.

### **Core Principles**
- **Fixed Viewport**: The main container should be locked to the viewport height using `h-[calc(100vh-OFFSET)]` (typically `OFFSET` is 80px-120px depending on the header/footer needs).
- **Overflow Hidden**: The root container must use `overflow-hidden` to prevent browser scrollbars.
- **Flex-Col for Stacking**: Use `flex flex-col` for the vertical structure.
- **Dynamic Content Scaling**:
  - **Main Content (Card Area)**: Use `flex-grow` with a `max-h-[50vh]` (mobile) or `max-h-[60vh]` (desktop) constraint.
  - **Internal Scrolling**: Content within the card must handle its own overflow with `overflow-y-auto`.
- **Pinned Footers**: Use `mt-auto flex-shrink-0` for the footer cluster (Voting, Navigation, Stats) to ensure they are always visible and static at the bottom.

### **Standard Wrapper Snippet**
```tsx
<div className="flex flex-col h-[calc(100vh-80px)] overflow-hidden p-4 font-sans">
  {/* Header/Progress (Shrink-0) */}
  <div className="shrink-0 mb-4">...</div>

  {/* Main Content (Flex-Grow) */}
  <div className="flex-grow flex flex-col items-center justify-center relative overflow-hidden min-h-0">
    <div className="w-full h-full max-h-[50vh] aspect-[4/3]">
       {/* Content with internal scroll */}
    </div>
  </div>

  {/* Pinned Footer (Mt-Auto) */}
  <div className="mt-auto shrink-0 flex flex-col gap-4">
    {/* Navigation & Voting */}
  </div>
</div>
```

---

## 2. Flashcard Flip Stability

To prevent the "jumpy" or "jitter" bug during 3D rotations, use absolute anchor positioning.

### **Rules**
- **Absolute Anchor**: Use `absolute inset-0 top-0 left-0` on both `.card-front` and `.card-back`.
- **Stable Height**: Never use `h-auto` for the card faces. They must be `h-full`.
- **Backface Visibility**: Ensure `backface-visibility: hidden` and `transform-style: preserve-3d` are applied.

---

## 3. Premium Feedback & Animation Logic

Animations should feel "physics-based" and "instant" to create a premium feel.

### **Animation-First Logic**
- **Trigger**: Execute UI state updates (e.g., `setVote`, triggering button scale) *before* making API calls or auto-advancing.
- **Auto-Advance Delay**: Allow a `setTimeout` of **0.7s to 0.8s** before moving to the next card to let the user appreciate the feedback animation.

### **Spring Physics (Framer Motion)**
- **Standard Settings**: `stiffness: 400`, `damping: 25`.
- **Button Interaction**:
  - **whileTap**: `scale: 0.92`.
  - **Active State**: `scale: 1.08`.
  - **Icon Jump**: `y: -8` jump-and-fade on select.
- **Stats Bar**: Animate width from `0%` with `easeOut` and `0.8s` duration, using `staggerChildren: 0.1s`.

---

## 4. Typography & Visual Standards (Vietnamese Support)

### **Typography Rules**
- **Font**: Use `font-sans` (Inter/Roboto/Geist) for all text.
- **No Italics**: **DO NOT** use `italic` styling for labels (DỄ, VỪA, KHÓ) or modal text. Vietnamese diacritics often render incorrectly or overlap with tilted characters. Use `font-black` or `font-extrabold` for emphasis instead.

### **Visual Highlights**
- **Active Colors**: Emerald-500 (Easy), Amber-500 (Medium), Rose-500 (Hard).
- **Grounded Glow**: Active buttons must have a `shadow-[0_0_20px_COLOR]` where `COLOR` is the specific theme glow.
- **Border Radius**: Consistent use of `rounded-2xl` for stats and `rounded-3xl` for main cards and modals.

---

## 5. Mistake Prevention (Don't Repeat)

- **Lỗi Invariant Keyframes**: Không dùng mảng keyframes (e.g., `[1, 1.4, 1]`) chung với `type: "spring"`. Hãy để spring tự điều hướng về giá trị đích.
- **Lỗi Layout Shift**: Không để `h-auto` cho Flashcard. Luôn khóa chiều cao bằng một container cha có `h-full` hoặc `aspect-ratio` cố định.
