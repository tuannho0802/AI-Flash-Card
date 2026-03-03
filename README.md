# ⚡ AI Flashcards Generator

> **Instantly create educational flashcards on any topic using Google's Gemini AI.**
> Built with Next.js 15, Tailwind CSS v4, and the latest Google GenAI SDK.

![AI Flashcards Banner](https://via.placeholder.com/1200x400?text=AI+Flashcards+Generator+Powered+by+Gemini)

## 🚀 Key Features

### 🧠 Robust AI Integration
- **Hybrid AI Categorization**: Automatically categorizes topics into 1-2 words (e.g., Programming, English, Science) using prioritized logic.
- **Smart Model Rotation**: Intelligent fallback system targeting:
  1. `gemini-2.0-flash-lite` (Fastest, latest)
  2. `gemini-1.5-flash` (Stable throughput)
  3. `gemini-1.5-pro` (Highest quality / High quota limits)

### 🧭 Navigation & UX
- **Premium Study Mode**: High-fidelity interaction engine featuring:
  - **Zero-Overlap Layout**: Fixed viewport architecture (`h-[calc(100vh-offset)]`) to prevent element shifting.
  - **Stable 3D Flips**: Absolute coordinate anchoring to eliminate jitter during card rotations.
  - **Physics-Based Animation**: Fluid interactions powered by standardized spring physics (`stiffness: 400, damping: 25`).
- **Glassmorphic Sidebar**: Professional side navigation with smooth transitions and collapsible mode.
- **Autonomous Category System**: Fully automated classification with semantic icon mapping and auto-translation.

### 📊 Community Intelligence
- **Community Voting System**: Real-time difficulty rating system (Easy, Medium, Hard).
- **Difficulty Statistics**: Aggregated community insights displayed via animated progress bars on flashcard backs.
- **Optimistic UI**: Instant visual feedback for votes using "Animation-First" logic.

### 🧠 Database Workflow & AI Pipeline
To maintain a high-quality library, the system follows a structured data pipeline:
1.  **Normalization**: AI converts raw user input (e.g., "hoc js") into a canonical `normalized_topic` (e.g., "JavaScript Programming").
2.  **Aliasing**: Key phrases and variations are stored in the `aliases` array for resilient searching.
3.  **Auto-linking**: The engine calls `resolveCategoryId` to find or create the perfect category match using semantic mapping.
4.  **Contributor Tracking**: Every user who generates or merges cards for a set is tracked in the `contributor_ids` (UUID[]) column.

### 🛡️ Admin Portal (RBAC)
- **Restricted Tools**: Dedicated Admin Section for **Category Management**, **Backfill Categorization**, and **Duplicate Merging**.
- **Instant Access**: Toggle Admin Tab quickly using the `Shift + M` hotkey.
- **Session-based Security**: API routes verified via `getUser()` and `process.env.ADMIN_EMAIL`.

## 🛠️ Tech Stack

- **Framework**: [Next.js 15](https://nextjs.org/) (App Router & AppShell layout)
- **AI Infrastructure**: [Google GenAI SDK](https://www.npmjs.com/package/@google/genai) (`v1beta` API)
- **Database**: [Supabase](https://supabase.com/) (PostgreSQL + Real-time Views)
- **Styling**: Tailwind CSS v4 + Framer Motion v12
- **Typography**: Optimized Vietnamese support (font-sans, strictly no italics for diacritic stability).
- **Icons**: Lucide React


## 📚 Developer Documentation (Source of Truth)

For detailed technical standards, database migrations, and coding patterns, refer to the [**`vercel-skills/`**](./vercel-skills/) directory:

- [**`INSTRUCTION.md`**](./vercel-skills/INSTRUCTION.md): Core architecture and Standard Operating Procedures (SOP).
- [**`ui-ux-standards.md`**](./vercel-skills/ui-ux-standards.md): Visual and interaction "Source of Truth".
- [**`Migration DB Instruction.md`**](./vercel-skills/Migration%20DB%20Instruction.md): Full schema and SQL snippets.
- [**`PROGRESS.md`**](./vercel-skills/PROGRESS.md): Technical milestones and bug-fix logs.


## 📦 Getting Started

### Prerequisites
- Node.js 18+ & Supabase Project.
- A Google Cloud API Key.

### Installation & Environment

1.  **Configure `.env.local`**:
    ```env
    NEXT_PUBLIC_GEMINI_API_KEY=your_key
    GEMINI_API_KEY=your_key
    CRON_SECRET=your_secret_for_admin_api
    NEXT_PUBLIC_SUPABASE_URL=...
    NEXT_PUBLIC_SUPABASE_ANON_KEY=...
    ```

## 🔐 Admin Guide

### 1. Enabling Admin Status
Admins are defined in the `profiles` table. The `role` column must be set to `'admin'`.

### 2. Accessing Tools
- **Hotkey**: Press `Shift + M` on any page to open the Admin tab in the sidebar.
- **Backfill Tool**: Automatically processes uncategorized sets (3 records per run) with a 7s safety delay.

4.  **Run the Development Server**:
    ```bash
    npm run dev
    ```
    Open [http://localhost:3000](http://localhost:3000) to see the app in action.

## 👨‍💻 Development Workflow

To maintain code quality and system stability, we follow these strict procedures (extracted from [`INSTRUCTION.md`](./INSTRUCTION.md)):

### 1. Zero Syntax Error Policy
Before any commit, run the TypeScript compiler to ensure no type errors exist:
```bash
npx tsc --noEmit
```
*Note: We prioritize explicit types (`unknown` with type narrowing) over `any`.*

### 2. Debugging Quota Errors (429)
If you encounter a `429 Resource Exhausted` error:
- **Do not panic**: The UI will display a yellow countdown warning.
- **Wait**: Respect the `retryAfter` delay (usually 30s).
- **Check Model**: Ensure `route.ts` is targeting a valid Free Tier model (`gemini-flash-latest`).

### 3. Adding New Features
- Always check `INSTRUCTION.md` for architectural consistency.
- Prefer editing existing files over creating new ones.
- Use **Manual Parsing** for any new AI JSON outputs.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

> **Note for Developers**: This project serves as a reference implementation for integrating Google's GenAI SDK v1+ with Next.js 15 in a production-ready manner.
