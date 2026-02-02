# React & Next.js Best Practices (AI Flashcards Edition)

Performance and stability guidelines tailored for the AI Flashcards architecture.

## Critical Guidelines

### 1. `useEffect` Usage with External Services
- **Supabase Auth**: When checking user session, always handle the async nature and potential race conditions.
  ```tsx
  // Correct Pattern in page.tsx
  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (mounted) setUserId(user?.id || null);
    };
    let mounted = true;
    checkUser();
    return () => { mounted = false; }; // Cleanup prevents state update on unmount
  }, [supabase]);
  ```
- **Gemini Rate Limits**: When handling 429 errors, use a countdown timer in `useEffect` that cleans itself up.
  ```tsx
  useEffect(() => {
    if (!countdown) return;
    const timer = setInterval(() => setCountdown(c => c - 1), 1000);
    return () => clearInterval(timer);
  }, [countdown]);
  ```

### 2. Zero Syntax Error Policy
- **Rule**: Always run `npx tsc --noEmit` after changes.
- **Why**: Next.js build will fail if there are any TypeScript errors, even if dev server runs.
- **Common Fixes**:
  - Use `&apos;` for single quotes in JSX.
  - Remove unused imports (like `useRouter` when not navigating).

### 3. Server Actions vs API Routes
- **Current Architecture**: We use API Routes (`/api/generate`) for AI generation to allow stream handling and better timeout control.
- **Future Consideration**: For simple DB mutations (saving flashcards), prefer Server Actions to reduce boilerplate.

### 4. Client Component Boundaries
- **Rule**: Minimize the scope of `"use client"`.
- **Optimization**: Keep heavy dependencies (like `framer-motion`) inside Client Components.
- **Example**: `page.tsx` is Client because it manages complex state, but `layout.tsx` remains Server.

### 5. Manual JSON Parsing (The "Anti-Fragile" Pattern)
- **Context**: Google GenAI SDK can be strict.
- **Best Practice**: Do NOT trust `responseMimeType: 'application/json'` blindly on Free Tier.
- **Solution**: Always use regex to extract the JSON array from the raw text response.
