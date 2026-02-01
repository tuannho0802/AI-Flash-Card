# ⚡ AI Flashcards Generator

> **Instantly create educational flashcards on any topic using Google's Gemini AI.**
> Built with Next.js 15, Tailwind CSS v4, and the latest Google GenAI SDK.

![AI Flashcards Banner](https://via.placeholder.com/1200x400?text=AI+Flashcards+Generator+Powered+by+Gemini)

## 🚀 Key Features

### 🧠 Robust AI Integration
- **Smart Model Selection**: Automatically targets `gemini-flash-latest` (via `v1beta` API) for the best balance of speed and stability.
- **Resilient Error Handling**: Intelligent management of **429 Rate Limit** errors with a user-friendly countdown timer and automatic model fallback strategies to `gemini-1.5-flash` or `gemini-2.0-flash`.
- **Zero 404s**: Advanced model verification ensures requests are never sent to deprecated or non-existent model endpoints.

### 🛡️ "Anti-Fragile" JSON Parsing
- **No More Crashes**: Instead of relying on the SDK's strict JSON Mode (which often fails with `400 INVALID_ARGUMENT` on Free Tier), we use a battle-tested **Manual Parsing Engine**.
- **Regex & Slice Logic**: We cleanly extract JSON arrays from raw text responses, stripping out Markdown code blocks (` ```json `) to guarantee valid data every time.

### 🎨 Modern & Responsive UI
- **3D Flip Animations**: Smooth, physics-based card flipping effects powered by **Framer Motion**.
- **Glassmorphism Design**: Sleek, modern interface using **Tailwind CSS v4** with dark mode support.
- **Real-Time Feedback**: Instant loading states, error toasts, and rate-limit countdowns keep users informed.

## 🛠️ Tech Stack

- **Framework**: [Next.js 15](https://nextjs.org/) (App Router & Server Actions)
- **Language**: [TypeScript](https://www.typescriptlang.org/) (Strict Mode)
- **AI SDK**: [`@google/genai`](https://www.npmjs.com/package/@google/genai) (Latest v1.39+)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Animation**: [Framer Motion](https://www.framer.com/motion/)
- **Icons**: [Lucide React](https://lucide.dev/)

## 📦 Getting Started

### Prerequisites
- Node.js 18+ installed.
- A Google Cloud API Key (Get one [here](https://aistudio.google.com/app/apikey)).

### Installation

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/your-username/ai-flashcards.git
    cd ai-flashcards
    ```

2.  **Install dependencies**:
    ```bash
    npm install
    # or
    yarn install
    # or
    pnpm install
    ```

3.  **Configure Environment Variables**:
    Create a `.env.local` file in the root directory based on `.env.example`:
    ```bash
    cp .env.example .env.local
    ```
    Add your Gemini API Key:
    ```env
    NEXT_PUBLIC_GEMINI_API_KEY=your_api_key_here
    ```

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
