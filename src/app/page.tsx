"use client";

import {
  useState,
  useEffect,
  useCallback,
  KeyboardEvent,
  useMemo,
  Suspense,
  useRef,
} from "react";
import parse from "partial-json-parser";
import { useSearchParams } from "next/navigation";
import {
  Loader2,
  Sparkles,
  BrainCircuit,
  History,
  CheckCircle,
  Search,
  Filter,
  X,
} from "lucide-react";
import {
  motion,
  AnimatePresence,
} from "framer-motion";
import { createClient } from "@/utils/supabase/client";
import { fetchWithRetry } from "@/utils/api";
import {
  Flashcard,
  FlashcardSet,
} from "@/types/flashcard";
import { useLearningProgress } from "@/hooks/useLearningProgress";

// Display Modes
import GridMode from "@/components/display-modes/GridMode";
import StudyMode from "@/components/display-modes/StudyMode";
import ListMode from "@/components/display-modes/ListMode";
import DisplayController, {
  DisplayMode,
} from "@/components/DisplayController";

export default function Home() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="animate-spin text-indigo-400 w-12 h-12" />
      </div>
    }>
      <FlashcardsApp />
    </Suspense>
  );
}

function FlashcardsApp() {
  const [supabase] = useState(() => createClient());
  const [topic, setTopic] = useState("");
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [recentSets, setRecentSets] = useState<FlashcardSet[]>([]);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [quantity, setQuantity] = useState(5);
  const [userId, setUserId] = useState<string | null>(null);
  const [retryMessage, setRetryMessage] = useState<string | null>(null);
  const [retryCountdown, setRetryCountdown] = useState<number | null>(null);
  const [retryAttempt, setRetryAttempt] = useState<number>(0);

  // Focus Mode & Search State
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showHardOnly, setShowHardOnly] = useState(false);
  const { progress } = useLearningProgress();
  const sessionCache = useRef<Map<string, any>>(new Map());

  // Unified toast for successes
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Display Mode State
  const [mode, setMode] = useState<DisplayMode>("grid");
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAdminSidebar, setShowAdminSidebar] = useState(false);
  const searchParams = useSearchParams();

  // Initial Data & Auth
  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id || null);
      if (user) {
        const { data: pf } = await supabase.from("profiles").select("role").eq("id", user.id).single();
        setIsAdmin(pf?.role === "admin");
      }
    };
    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id || null);
      if (session?.user) {
        supabase.from("profiles").select("role").eq("id", session.user.id).single()
          .then(({ data }) => setIsAdmin(data?.role === "admin"));
      } else {
        setIsAdmin(false);
        setShowAdminSidebar(false);
      }
    });
    return () => subscription.unsubscribe();
  }, [supabase]);

  // Load mode preference
  useEffect(() => {
    const saved = localStorage.getItem("displayMode") as DisplayMode;
    if (["grid", "study", "list"].includes(saved)) setMode(saved);
  }, []);

  const fetchRecentSets = useCallback(async () => {
    let query = supabase.from("flashcard_sets").select("*").order("created_at", { ascending: false }).limit(8);
    if (userId) query = query.contains("contributor_ids", [userId]);
    const { data } = await query;
    if (data) setRecentSets(data as FlashcardSet[]);
  }, [supabase, userId]);

  useEffect(() => { fetchRecentSets(); }, [fetchRecentSets]);

  const handleModeChange = (m: DisplayMode) => {
    setMode(m);
    localStorage.setItem("displayMode", m);
  };

  const shuffleArray = useCallback(<T,>(array: T[]): T[] => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
  }, []);

  const handleShuffle = useCallback(() => {
    setFlashcards((prev) => shuffleArray(prev));
  }, [shuffleArray]);

  const coreGenerate = useCallback(
    async (skipDbCheck: boolean = false) => {
      if (!topic.trim()) return;

      setLoading(true);
      setError(null);
      setCountdown(null);
      setSavedSuccess(false);
      setRetryMessage(null);
      setRetryAttempt(0);

      const cleanedTopic = topic.trim().toLowerCase();

      // Session Cache Check
      if (sessionCache.current.has(cleanedTopic) && !skipDbCheck) {
        const cached = sessionCache.current.get(cleanedTopic);
        setTopic(cached.normalized_topic);
        setFlashcards(cached.flashcards);
        setLoading(false);
        setSavedSuccess(true);
        return;
      }

      try {
        console.log(`Starting Streaming Generation for: ${topic}`);

        const response = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ topic: topic.trim(), count: quantity, userId }),
        });

        if (!response.ok) {
          if (response.status === 429) {
            setRetryMessage(`Hệ thống đang bận (429), đang tự động nghỉ ngơi 30s để AI 'hạ nhiệt'...`);
            setRetryCountdown(30);
            throw new Error("Rate limit exceeded");
          }
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || "Generation failed.");
        }

        if (!response.body) throw new Error("No response body");

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let accumulatedText = "";
        
        // Clear flashcards for new generation to see streaming effect
        setFlashcards([]);

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          console.log('Chunk received:', chunk);
          accumulatedText += chunk;

          try {
            const partialData = parse(accumulatedText);
            
            if (partialData.normalized_topic && partialData.normalized_topic !== topic) {
              setTopic(partialData.normalized_topic);
            }

            if (partialData.flashcards && Array.isArray(partialData.flashcards)) {
              // Filter out incomplete cards (where front or back might be missing/empty while AI is typing)
              const completedCards = partialData.flashcards.filter((card: any) => 
                card && 
                typeof card.front === 'string' && card.front.trim().length > 0 &&
                typeof card.back === 'string' && card.back.trim().length > 0
              );

              if (completedCards.length > 0) {
                console.log('Current Parsed Cards (Ready):', completedCards.length);
                
                setFlashcards(prev => {
                  // Only update if we have more completed cards or if the last completed card was updated
                  const hasMore = completedCards.length > prev.length;
                  const lastChanged = prev.length > 0 && 
                                    JSON.stringify(completedCards[completedCards.length - 1]) !== JSON.stringify(prev[prev.length - 1]);
                  
                  if (hasMore || lastChanged) {
                    return [...completedCards];
                  }
                  return prev;
                });

                // Force React to yield and render the update
                await new Promise(r => setTimeout(r, 5));
              }
            }
          } catch (e) {
            // Background parsing error is expected for very early chunks
          }
        }

        // Final cleanup and cache update
        try {
          const finalData = JSON.parse(accumulatedText);
          if (finalData.flashcards) {
            setTopic(finalData.normalized_topic);
            setFlashcards(finalData.flashcards);
            sessionCache.current.set(cleanedTopic, {
              normalized_topic: finalData.normalized_topic,
              flashcards: finalData.flashcards
            });
            setSavedSuccess(true);
            fetchRecentSets();
            setToastMessage(`Hoàn tất bộ thẻ "${finalData.normalized_topic}"!`);
            setTimeout(() => setToastMessage(null), 5000);
          }
        } catch (e) {
          console.error("Stream final data parse failed:", e);
        }

      } catch (err: any) {
        console.error("Generate Error:", err);
        setError(err.message || "Something went wrong.");
      } finally {
        setLoading(false);
      }
    },
    [topic, quantity, userId, fetchRecentSets]
  );

  const handleGenerateNew = useCallback(async () => {
    if (loading) return;
    if (mode === "study" && !window.confirm("Generating new cards will interrupt your study session. Continue?")) return;
    await coreGenerate(true);
  }, [loading, mode, coreGenerate]);

  const handleAdminMerge = async () => {
    if (!confirm("Are you sure you want to merge duplicate topics?")) return;
    setLoading(true);
    try {
      const res = await fetch("/api/admin/merge", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setToastMessage(data.message);
        fetchRecentSets();
      } else {
        setError(data.error || "Failed to merge topics");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: any) => {
      if (["INPUT", "TEXTAREA"].includes(document.activeElement?.tagName || "")) return;
      if (e.key.toLowerCase() === "s") { e.preventDefault(); handleShuffle(); }
      if (e.key.toLowerCase() === "n") { e.preventDefault(); handleGenerateNew(); }
      if (isAdmin && e.shiftKey && e.key.toLowerCase() === "m") { e.preventDefault(); setShowAdminSidebar(p => !p); }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleShuffle, handleGenerateNew, isAdmin]);

  // Countdown timers
  useEffect(() => {
    if (!countdown || countdown <= 0) return;
    const t = setInterval(() => setCountdown(p => p && p > 0 ? p - 1 : 0), 1000);
    return () => clearInterval(t);
  }, [countdown]);

  useEffect(() => {
    if (!retryCountdown || retryCountdown <= 0) return;
    const t = setInterval(() => setRetryCountdown(p => p && p > 0 ? p - 1 : 0), 1000);
    return () => clearInterval(t);
  }, [retryCountdown]);

  const filteredSets = useMemo(() => {
    return recentSets.filter(s => {
      const low = searchTerm.toLowerCase();
      const match = s.topic.toLowerCase().includes(low) || 
                   s.normalized_topic.toLowerCase().includes(low) ||
                   (s.aliases || []).some(a => a.toLowerCase().includes(low));
      if (!match) return false;
      if (showHardOnly) return s.cards.some(c => progress[c.front]?.difficulty === "hard");
      return true;
    });
  }, [recentSets, searchTerm, showHardOnly, progress]);

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-linear-to-r from-indigo-400 to-cyan-400 sm:text-5xl">AI Flashcards</h1>
        <p className="text-lg text-slate-400">Create flashcards instantly from any topic.</p>
      </div>

      <div className="bg-slate-800/50 rounded-2xl p-6 md:p-8 space-y-6 border border-slate-700/50 backdrop-blur-sm shadow-xl">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-slate-300 mb-2">Topic</label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && coreGenerate()}
              placeholder="e.g., Quantum Physics, React Hooks..."
              className="w-full px-4 py-3 rounded-xl bg-slate-900/50 border border-slate-600 text-white outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="w-full md:w-32">
            <label className="block text-sm font-medium text-slate-300 mb-2">Quantity</label>
            <input
              type="number"
              min={1} max={50}
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              className="w-full px-4 py-3 rounded-xl bg-slate-900/50 border border-slate-600 text-white outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {error && <div className="p-4 bg-red-500/10 text-red-400 rounded-xl border border-red-500/20 text-sm">Error: {error}</div>}
        {retryCountdown !== null && retryCountdown > 0 && (
          <div className="p-3 bg-amber-500/10 text-amber-400 rounded-lg text-sm border border-amber-500/20 animate-pulse text-center">
            {retryMessage} ({retryCountdown}s)
          </div>
        )}

        <button
          onClick={() => coreGenerate(false)}
          disabled={loading || !topic.trim()}
          className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-500 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 className="animate-spin" /> : <Sparkles />}
          {loading ? "Processing..." : "Generate Flashcards"}
        </button>
      </div>

      {flashcards.length > 0 && (
        <div className={isFocusMode ? "fixed inset-0 z-[100] bg-slate-900/95 flex flex-col p-4 animate-in fade-in" : "space-y-6"}>
          <div className="flex justify-between items-center bg-slate-800 p-4 rounded-xl border border-slate-700 shadow-sm">
             <div className={isFocusMode ? "hidden" : "flex items-center gap-2"}>
               <BrainCircuit className="text-indigo-400" />
               <div>
                 <h2 className="font-bold text-white uppercase tracking-tight">{topic}</h2>
                 <p className="text-xs text-slate-500">{flashcards.length} cards</p>
               </div>
             </div>
             <div className="flex items-center gap-3">
               {savedSuccess && <span className="text-emerald-400 text-xs font-bold px-3 py-1 bg-emerald-500/10 rounded-full border border-emerald-500/20">SAVED</span>}
               <DisplayController
                 currentMode={mode}
                 onModeChange={handleModeChange}
                 onShuffle={handleShuffle}
                 onGenerateNew={handleGenerateNew}
                 loadingNew={loading}
                 onToggleFocus={() => setIsFocusMode(!isFocusMode)}
                 isFocusMode={isFocusMode}
               />
             </div>
          </div>
          <div className="flex-1 h-full min-h-[400px]">
            {mode === "grid" && <GridMode flashcards={flashcards} />}
            {mode === "study" && <StudyMode flashcards={flashcards} />}
            {mode === "list" && <ListMode flashcards={flashcards} />}
          </div>
        </div>
      )}

      {recentSets.length > 0 && (
        <div className="pt-8 border-t border-slate-800">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <h3 className="text-xl font-bold text-white flex items-center gap-2"><History className="text-indigo-400"/> History</h3>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  placeholder="Search history..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 pr-4 py-2 rounded-lg bg-slate-800 text-sm text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <button
                onClick={() => setShowHardOnly(!showHardOnly)}
                className={`p-2 rounded-lg border ${showHardOnly ? "bg-rose-500/20 border-rose-500/40 text-rose-400" : "bg-slate-800 border-slate-700 text-slate-500"}`}
              >
                <Filter className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {filteredSets.map(s => (
              <button
                key={s.id}
                onClick={() => { setTopic(s.topic); setFlashcards(s.cards); }}
                className="text-left bg-slate-800/40 p-4 rounded-xl border border-slate-700/50 hover:border-indigo-500 transition-all group"
              >
                <div className="font-bold text-slate-200 truncate group-hover:text-indigo-400">{s.topic}</div>
                <div className="text-xs text-slate-500 mt-1">{s.cards.length} cards • {new Date(s.created_at).toLocaleDateString()}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 right-6 bg-indigo-600 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 z-[100] border border-indigo-400/30"
          >
            <CheckCircle className="w-5 h-5" /> {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isAdmin && showAdminSidebar && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowAdminSidebar(false)} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110]" />
            <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} className="fixed right-0 top-0 bottom-0 w-full max-w-sm bg-slate-900 border-l border-slate-800 z-[120]">
              <div className="p-6 border-b border-slate-800 flex justify-between items-center">
                <h2 className="text-xl font-bold text-white flex items-center gap-2"><Sparkles className="text-indigo-400"/> Admin</h2>
                <button onClick={() => setShowAdminSidebar(false)} className="text-slate-400 hover:text-white"><X/></button>
              </div>
              <div className="p-6 space-y-6">
                <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-4">
                  <p className="text-sm text-amber-200/80 leading-relaxed">Gộp các bộ thẻ trùng lặp dựa trên tên chuẩn hóa để tối ưu dung lượng.</p>
                  <button onClick={handleAdminMerge} disabled={loading} className="w-full py-3 bg-amber-600 rounded-lg font-bold text-white hover:bg-amber-500 transition-all flex justify-center gap-2">
                    {loading ? <Loader2 className="animate-spin" /> : "Merge Duplicates"}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}