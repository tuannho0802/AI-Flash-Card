"use client";

import {
  useState,
  useEffect,
  useCallback,
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
  ChevronDown,
  Edit2,
  Menu,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/utils/supabase/client";
import { Flashcard, FlashcardSet } from "@/types/flashcard";
import { useLearningProgress } from "@/hooks/useLearningProgress";
import { getCategoryColor } from "@/utils/categoryColor";
import { CategoryBadge } from "@/components/CategoryBadge";
import AppSidebar, { SidebarTab } from "@/components/AppSidebar";
import CategoriesAdmin from "@/components/CategoriesAdmin";
import FocusModesAdmin from "@/components/FocusModesAdmin";
import FocusControls from "@/components/FocusControls";

import GridMode from "@/components/display-modes/GridMode";
import StudyMode from "@/components/display-modes/StudyMode";
import ListMode from "@/components/display-modes/ListMode";
import DisplayController, { DisplayMode } from "@/components/DisplayController";

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
  const [category, setCategory] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [retryMessage, setRetryMessage] = useState<string | null>(null);
  const [retryCountdown, setRetryCountdown] = useState<number | null>(null);
  const [retryAttempt, setRetryAttempt] = useState<number>(0);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showHardOnly, setShowHardOnly] = useState(false);
  const { progress } = useLearningProgress();
  const sessionCache = useRef<Map<string, any>>(new Map());
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [mode, setMode] = useState<DisplayMode>("grid");
  const [isAdmin, setIsAdmin] = useState(false);

  // ── NEW: Sidebar & Tab State ──────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<SidebarTab>("home");
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string | null>(null);
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [backfillResult, setBackfillResult] = useState<any>(null);
  const [backfillLoading, setBackfillLoading] = useState(false);

  const searchParams = useSearchParams();

  // ── Auth & Init ──────────────────────────────────────────────────────────
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
      }
    });
    return () => subscription.unsubscribe();
  }, [supabase]);

  useEffect(() => {
    const saved = localStorage.getItem("displayMode") as DisplayMode;
    if (["grid", "study", "list"].includes(saved)) setMode(saved);

    const sidebarCollapsed = localStorage.getItem("sidebarCollapsed") === "true";
    setIsSidebarCollapsed(sidebarCollapsed);
  }, []);

  const fetchRecentSets = useCallback(async () => {
    let query = supabase
      .from("flashcard_sets")
      .select("*, categories(*)")
      .order("created_at", { ascending: false })
      .limit(24);
    if (userId) {
      query = query.or(`user_id.eq.${userId},user_id.is.null`);
    } else {
      query = query.is("user_id", null);
    }
    const { data } = await query;
    if (data) setRecentSets(data as FlashcardSet[]);
  }, [supabase, userId]);

  useEffect(() => { fetchRecentSets(); }, [fetchRecentSets]);

  // ── Derived data ─────────────────────────────────────────────────────────
  const uniqueCategories = useMemo(() => {
    const cats = new Set(recentSets.map(s => s.category).filter(Boolean));
    return Array.from(cats) as string[];
  }, [recentSets]);

  const filteredSets = useMemo(() => {
    return recentSets.filter(s => {
      if (filterCategory && s.category !== filterCategory) return false;
      const low = searchTerm.toLowerCase();
      const match = s.topic.toLowerCase().includes(low) ||
        s.normalized_topic.toLowerCase().includes(low) ||
        (s.aliases || []).some(a => a.toLowerCase().includes(low));
      if (!match) return false;
      if (showHardOnly) return s.cards.some(c => progress[c.front]?.difficulty === "hard");
      return true;
    });
  }, [recentSets, searchTerm, showHardOnly, progress, filterCategory]);

  const analyticsData = useMemo(() => {
    const totalCards = recentSets.reduce((sum, s) => sum + s.cards.length, 0);

    // Grouping by ID to prevent text-based duplicates (e.g., "Lịch sử" vs "lịch sử")
    const categoryInfoMap = new Map<string, { count: number, name: string, category: any }>();

    recentSets.forEach(s => {
      // Use category_id as primary key, fallback to a special key for unlinked sets
      const groupKey = s.category_id || "UNCATEGORIZED";
      const existing = categoryInfoMap.get(groupKey);

      if (existing) {
        existing.count += s.cards.length;
        // If we found a set with the actual categories relation, use it for metadata
        if (!existing.category && s.categories) {
          existing.category = s.categories;
          existing.name = s.categories.name;
        }
      } else {
        categoryInfoMap.set(groupKey, {
          count: s.cards.length,
          name: s.categories?.name || s.category || "Chưa phân loại",
          category: s.categories || null
        });
      }
    });

    const sorted = Array.from(categoryInfoMap.values())
      .sort((a, b) => b.count - a.count);

    return { totalCards, totalSets: recentSets.length, byCategory: sorted };
  }, [recentSets]);

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleModeChange = (m: DisplayMode) => {
    setMode(m);
    localStorage.setItem("displayMode", m);
  };

  const shuffleArray = useCallback(<T,>(array: T[]): T[] => {
    const a = [...array];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }, []);

  const handleShuffle = useCallback(() => {
    setFlashcards(prev => shuffleArray(prev));
  }, [shuffleArray]);

  const coreGenerate = useCallback(async (skipDbCheck = false) => {
    if (!topic.trim()) return;
    setLoading(true);
    setError(null);
    setCountdown(null);
    setSavedSuccess(false);
    setRetryMessage(null);
    setRetryAttempt(0);

    const cleanedTopic = topic.trim().toLowerCase();
    if (sessionCache.current.has(cleanedTopic) && !skipDbCheck) {
      const cached = sessionCache.current.get(cleanedTopic);
      setTopic(cached.normalized_topic);
      setFlashcards(cached.flashcards);
      setLoading(false);
      setSavedSuccess(true);
      return;
    }

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: topic.trim(), count: quantity, userId, category: category.trim() || undefined }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          setRetryMessage("Hệ thống đang bận (429), đang tự động nghỉ ngơi 30s...");
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
      setFlashcards([]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        accumulatedText += chunk;
        try {
          const partialData = parse(accumulatedText);
          if (partialData.normalized_topic && partialData.normalized_topic !== topic) setTopic(partialData.normalized_topic);
          if (partialData.flashcards && Array.isArray(partialData.flashcards)) {
            const completedCards = partialData.flashcards.filter((card: any) =>
              card && typeof card.front === "string" && card.front.trim().length > 0 &&
              typeof card.back === "string" && card.back.trim().length > 0
            );
            if (completedCards.length > 0) {
              setFlashcards(prev => {
                const hasMore = completedCards.length > prev.length;
                const lastChanged = prev.length > 0 &&
                  JSON.stringify(completedCards[completedCards.length - 1]) !== JSON.stringify(prev[prev.length - 1]);
                return hasMore || lastChanged ? [...completedCards] : prev;
              });
              await new Promise(r => setTimeout(r, 5));
            }
          }
        } catch (_) { /* partial parse noise */ }
      }

      try {
        const finalData = JSON.parse(accumulatedText);
        if (finalData.flashcards) {
          setTopic(finalData.normalized_topic);
          setFlashcards(finalData.flashcards);
          sessionCache.current.set(cleanedTopic, {
            normalized_topic: finalData.normalized_topic,
            flashcards: finalData.flashcards,
          });
          setSavedSuccess(true);
          fetchRecentSets();
          setToastMessage(`Hoàn tất bộ thẻ "${finalData.normalized_topic}"!`);
          setTimeout(() => setToastMessage(null), 5000);
        }
      } catch (e) { console.error("Final parse failed:", e); }

    } catch (err: any) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }, [topic, quantity, userId, category, fetchRecentSets]);

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
      if (res.ok) { setToastMessage(data.message); fetchRecentSets(); }
      else setError(data.error || "Failed to merge topics");
    } catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  };

  const handleBackfill = async () => {
    if (!confirm("Trigger AI backfill for uncategorized sets? (3 sets max, 7s delay each)")) return;
    setBackfillLoading(true);
    setBackfillResult(null);
    try {
      const res = await fetch("/api/admin/backfill", { method: "POST" });
      const data = await res.json();
      setBackfillResult(data);
      if (res.ok) fetchRecentSets();
    } catch (err: any) { setBackfillResult({ error: err.message }); }
    finally { setBackfillLoading(false); }
  };

  const handleEditCategory = async (setId: string, currentCategory: string | null) => {
    const newCat = window.prompt("Nhập danh mục mới (để trống để xóa):", currentCategory || "");
    if (newCat === null) return;
    const trimmed = newCat.trim() || null;
    const { error: updateErr } = await supabase.from("flashcard_sets").update({ category: trimmed }).eq("id", setId);
    if (updateErr) alert("Lỗi cập nhật: " + updateErr.message);
    else {
      setToastMessage(trimmed ? `Đã đặt danh mục: ${trimmed}` : "Đã xóa danh mục");
      fetchRecentSets();
    }
  };

  // ── Keyboard Shortcuts ───────────────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: any) => {
      if (["INPUT", "TEXTAREA"].includes(document.activeElement?.tagName || "")) return;
      if (e.key.toLowerCase() === "s") { e.preventDefault(); handleShuffle(); }
      if (e.key.toLowerCase() === "n") { e.preventDefault(); handleGenerateNew(); }
      if (isAdmin && e.shiftKey && e.key.toLowerCase() === "m") { e.preventDefault(); setActiveTab("admin"); }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleShuffle, handleGenerateNew, isAdmin]);

  useEffect(() => {
    if (!countdown || countdown <= 0) return;
    const t = setInterval(() => setCountdown(p => (p && p > 0 ? p - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [countdown]);

  useEffect(() => {
    if (!retryCountdown || retryCountdown <= 0) return;
    const t = setInterval(() => setRetryCountdown(p => (p && p > 0 ? p - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [retryCountdown]);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-full overflow-hidden">
      {/* Sidebar */}
      <AppSidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isAdmin={isAdmin}
        isMobileOpen={isMobileSidebarOpen}
        onMobileClose={() => setIsMobileSidebarOpen(false)}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => {
          const next = !isSidebarCollapsed;
          setIsSidebarCollapsed(next);
          localStorage.setItem("sidebarCollapsed", String(next));
        }}
      />

      {/* Mobile Hamburger */}
      <button
        onClick={() => setIsMobileSidebarOpen(true)}
        className="fixed top-3 left-3 z-50 md:hidden p-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 hover:text-white transition-colors"
        aria-label="Open navigation"
      >
        <Menu className="w-4 h-4" />
      </button>

      {/* ── Scrollable content ─────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">

        {/* ─── HOME ──────────────────────────────────────────────────────── */}
        {activeTab === "home" && (
          <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
            <div className="text-center space-y-2">
              <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400 sm:text-5xl">AI Flashcards</h1>
              <p className="text-lg text-slate-400">Create flashcards instantly from any topic.</p>
            </div>

            {/* Generate Form */}
            <div className="bg-slate-800/50 rounded-2xl p-6 md:p-8 space-y-6 border border-slate-700/50 backdrop-blur-sm shadow-xl">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-slate-300 mb-2">Chủ đề</label>
                  <input
                    type="text"
                    value={topic}
                    onChange={e => setTopic(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && coreGenerate()}
                    placeholder="e.g., Quantum Physics, React Hooks..."
                    className="w-full px-4 py-3 rounded-xl bg-slate-900/50 border border-slate-600 text-white outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="w-full md:w-40">
                  <label className="block text-sm font-medium text-slate-300 mb-2">Category (opt)</label>
                  <input
                    type="text"
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                    placeholder="ví dụ: Lịch sử..."
                    className="w-full px-4 py-3 rounded-xl bg-slate-900/50 border border-slate-600 text-white outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="w-full md:w-28">
                  <label className="block text-sm font-medium text-slate-300 mb-2">Số lượng</label>
                  <input
                    type="number"
                    min={1} max={50}
                    value={quantity}
                    onChange={e => setQuantity(Number(e.target.value))}
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

            {/* Flashcard Display */}
            {flashcards.length > 0 && (
              <div className={isFocusMode ? "fixed inset-0 z-[100] bg-slate-950 flex flex-col p-4 md:p-8 animate-in fade-in duration-500 overflow-hidden" : "space-y-6"}>
                {isFocusMode && (
                  <>
                    {/* Animated Ambient Background */}
                    <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
                      <div className="absolute -top-[20%] -left-[10%] w-[70vw] h-[70vw] rounded-full bg-indigo-900/20 blur-[120px] mix-blend-screen animate-[spin_20s_linear_infinite]" />
                      <div className="absolute bottom-[10%] -right-[10%] w-[60vw] h-[60vw] rounded-full bg-purple-900/20 blur-[120px] mix-blend-screen animate-[spin_25s_linear_infinite_reverse]" />
                    </div>

                    <FocusControls
                      isFocusMode={isFocusMode}
                      onExitFocus={() => setIsFocusMode(false)}
                    />
                  </>
                )}
                <div className={isFocusMode ? "flex justify-between items-center bg-white/5 backdrop-blur-xl border border-white/10 p-4 rounded-2xl shadow-2xl mb-6 relative z-10" : "flex justify-between items-center bg-slate-800 p-4 rounded-xl border border-slate-700 shadow-sm"}>
                  <div className={isFocusMode ? "hidden" : "flex items-center gap-2"}>
                    <BrainCircuit className="text-indigo-400" />
                    <div>
                      <h2 className="font-bold text-white uppercase tracking-tight">{topic}</h2>
                      <p className="text-xs text-slate-500">{flashcards.length} cards</p>
                    </div>
                  </div>
                  <div className={isFocusMode ? "flex items-center gap-4" : "flex items-center gap-3"}>
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
                <div className={`flex-1 relative z-10 flex flex-col ${isFocusMode ? "h-full bg-white/5 backdrop-blur-3xl border border-white/10 rounded-3xl shadow-2xl p-4 md:p-8 overflow-y-auto" : "h-full min-h-[400px]"}`}>
                  {mode === "grid" && <GridMode flashcards={flashcards} />}
                  {mode === "study" && <StudyMode flashcards={flashcards} />}
                  {mode === "list" && <ListMode flashcards={flashcards} />}
                </div>
              </div>
            )}

            {/* History */}
            {recentSets.length > 0 && (
              <div className="pt-8 border-t border-slate-800">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <History className="text-indigo-400" /> History
                  </h3>
                  <div className="flex gap-2 items-center flex-wrap">
                    {/* Search */}
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                      <input
                        placeholder="Search history..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="pl-9 pr-4 py-2 rounded-lg bg-slate-800 text-sm text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                    </div>

                    {/* Category filter */}
                    <div className="relative">
                      <button
                        onClick={() => setShowFilterMenu(p => !p)}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm transition-colors ${filterCategory
                          ? "bg-indigo-500/20 border-indigo-500/40 text-indigo-300"
                          : "bg-slate-800 border-slate-700 text-slate-400 hover:text-white"}`}
                      >
                        <Filter className="w-3.5 h-3.5" />
                        {filterCategory ?? "Lọc"}
                        <ChevronDown className="w-3 h-3" />
                      </button>
                      <AnimatePresence>
                        {showFilterMenu && (
                          <motion.div
                            initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                            className="absolute right-0 mt-1 w-52 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl z-50 p-2 space-y-0.5"
                          >
                            <button
                              onClick={() => { setFilterCategory(null); setShowFilterMenu(false); }}
                              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${!filterCategory ? "text-indigo-400 bg-indigo-500/10" : "text-slate-400 hover:bg-slate-700 hover:text-white"}`}
                            >
                              Tất cả
                            </button>
                            {uniqueCategories.map(cat => (
                              <button
                                key={cat}
                                onClick={() => { setFilterCategory(cat); setShowFilterMenu(false); }}
                                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${filterCategory === cat ? "text-indigo-400 bg-indigo-500/10" : "text-slate-400 hover:bg-slate-700 hover:text-white"}`}
                              >
                                {cat}
                              </button>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Hard filter */}
                    <button
                      onClick={() => setShowHardOnly(!showHardOnly)}
                      title="Chỉ hiện thẻ khó"
                      className={`p-2 rounded-lg border text-sm ${showHardOnly ? "bg-rose-500/20 border-rose-500/40 text-rose-400" : "bg-slate-800 border-slate-700 text-slate-500 hover:text-white"}`}
                    >
                      ★
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {filteredSets.map(s => (
                    <div
                      key={s.id}
                      onClick={() => { setTopic(s.topic); setFlashcards(s.cards); }}
                      className="text-left bg-slate-800/40 p-4 rounded-xl border border-slate-700/50 hover:border-indigo-500 transition-all group relative cursor-pointer"
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="font-bold text-slate-200 break-words leading-snug group-hover:text-indigo-400 flex-1">
                          {s.topic}
                        </div>
                        {/* Edit — Admin only */}
                        {isAdmin && (
                          <button
                            onClick={e => { e.stopPropagation(); handleEditCategory(s.id, s.category || null); }}
                            className="shrink-0 p-1 rounded-md hover:bg-slate-700 text-slate-600 hover:text-indigo-400 transition-colors"
                            title="Sửa danh mục"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-xs text-slate-500">
                          {s.cards.length} cards • {new Date(s.created_at).toLocaleDateString()}
                        </div>
                        <div className="shrink-0">
                          <CategoryBadge category={s.categories} fallbackName={s.category} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── ANALYTICS ─────────────────────────────────────────────────── */}
        {activeTab === "analytics" && (
          <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
            <div>
              <h1 className="text-2xl font-bold text-white">Thống kê</h1>
              <p className="text-slate-400 mt-1">Tổng quan về bộ sưu tập</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50">
                <p className="text-slate-400 text-sm mb-1">Tổng số thẻ</p>
                <p className="text-4xl font-extrabold text-white">{analyticsData.totalCards.toLocaleString()}</p>
              </div>
              <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50">
                <p className="text-slate-400 text-sm mb-1">Bộ chủ đề</p>
                <p className="text-4xl font-extrabold text-white">{analyticsData.totalSets}</p>
              </div>
            </div>

            <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50 space-y-4">
              <h2 className="font-bold text-white">Phân bố danh mục</h2>
              {analyticsData.byCategory.length === 0 ? (
                <p className="text-slate-500 text-sm">Chưa có dữ liệu</p>
              ) : analyticsData.byCategory.map((item) => {
                const percentage = Math.round((item.count / (analyticsData.totalCards || 1)) * 100);
                const colorKey = item.category?.color || (item.name === "Chưa phân loại" ? "slate" : "indigo");

                const barColorClass = colorKey === "blue" ? "from-blue-600 to-blue-400"
                  : colorKey === "emerald" ? "from-emerald-600 to-emerald-400"
                    : colorKey === "amber" ? "from-amber-600 to-amber-400"
                      : colorKey === "purple" ? "from-purple-600 to-purple-400"
                        : colorKey === "cyan" ? "from-cyan-600 to-cyan-400"
                          : colorKey === "rose" ? "from-rose-600 to-rose-400"
                            : colorKey === "pink" ? "from-pink-600 to-pink-400"
                              : colorKey === "orange" ? "from-orange-600 to-orange-400"
                                : colorKey === "indigo" ? "from-indigo-600 to-indigo-400"
                                  : colorKey === "green" ? "from-green-600 to-green-400"
                                    : "from-slate-600 to-slate-500";

                return (
                  <div key={item.category?.id || item.name}>
                    <div className="flex justify-between items-center mb-1.5">
                      <CategoryBadge category={item.category} fallbackName={item.name} />
                      <span className="text-slate-400 text-sm">{item.count} thẻ · {percentage}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-700/50 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        transition={{ duration: 1, ease: "easeOut" }}
                        className={`h-2 rounded-full bg-linear-to-r ${barColorClass} shadow-[0_0_8px_rgba(0,0,0,0.3)]`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50">
              <h2 className="font-bold text-white mb-4">Model AI đang dùng</h2>
              {["gemini-3-flash-preview", "gemini-2.5-flash", "gemini-2.5-flash-lite", "gemma-3-27b-it"].map((m, i) => (
                <div key={m} className="flex items-center gap-3 py-1.5">
                  <span className={`w-5 h-5 rounded-full text-[10px] font-black flex items-center justify-center ${i === 0 ? "bg-indigo-500 text-white" : "bg-slate-700 text-slate-400"}`}>{i + 1}</span>
                  <span className="text-sm text-slate-300">{m}</span>
                  {i === 0 && <span className="text-[10px] text-indigo-400 font-bold ml-auto">PRIMARY</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── LIBRARY ───────────────────────────────────────────────────── */}
        {activeTab === "library" && (
          <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-white">Thư viện công khai</h1>
              <p className="text-slate-400 mt-1">Tất cả bộ thẻ đã được AI tạo ra</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {recentSets.map(s => (
                <div
                  key={s.id}
                  onClick={() => { setTopic(s.topic); setFlashcards(s.cards); setActiveTab("home"); }}
                  className="bg-slate-800/40 p-4 rounded-xl border border-slate-700/50 hover:border-indigo-500 transition-all cursor-pointer group"
                >
                  <div className="font-semibold text-slate-200 group-hover:text-indigo-400 break-words leading-snug mb-3">{s.topic}</div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">{s.cards.length} cards</span>
                    <div className="shrink-0">
                      <CategoryBadge category={s.categories} fallbackName={s.category} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── ADMIN ─────────────────────────────────────────────────────── */}
        {activeTab === "admin" && isAdmin && (
          <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-white">Admin &amp; Công cụ</h1>
              <p className="text-slate-400 mt-1 text-sm">Chỉ Admin mới thấy trang này · <kbd className="bg-slate-700 px-1.5 py-0.5 rounded text-xs">Shift+M</kbd> để mở nhanh</p>
            </div>

            {/* Backfill */}
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-6 space-y-4">
              <h2 className="font-bold text-amber-300">Backfill Danh mục AI</h2>
              <p className="text-sm text-amber-200/70 leading-relaxed">Tự động phân loại tối đa <strong>3 bộ thẻ</strong> chưa gắn nhãn. Mỗi lần gọi cách nhau <strong>7 giây</strong> để bảo toàn quota. Model sẽ tự xoay vòng nếu gặp lỗi 429.</p>
              <button
                onClick={handleBackfill}
                disabled={backfillLoading}
                className="w-full py-3 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all"
              >
                {backfillLoading ? <Loader2 className="animate-spin w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
                {backfillLoading ? "Đang xử lý..." : "Trigger Backfill (3 bộ)"}
              </button>
              {backfillResult && (
                <div className="mt-2 bg-slate-900/60 rounded-xl p-4 text-xs font-mono overflow-auto max-h-48 space-y-1">
                  <p className="text-slate-400 mb-2">{backfillResult.message || backfillResult.error}</p>
                  {backfillResult.results?.map((r: any, i: number) => (
                    <div key={i} className={`flex items-center gap-2 py-0.5 ${r.status === "updated" ? "text-emerald-400" : "text-rose-400"}`}>
                      <span>{r.status === "updated" ? "✅" : "❌"}</span>
                      <span className="flex-1 truncate text-slate-300">{r.topic}</span>
                      {r.category && <span className="text-slate-400">→ {r.category}</span>}
                      {r.model && <span className="text-indigo-400 text-[10px] shrink-0">[{r.model}]</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Merge */}
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 space-y-4">
              <h2 className="font-bold text-white">Gộp chủ đề trùng lặp</h2>
              <p className="text-sm text-slate-400 leading-relaxed">Tìm và gộp các bộ thẻ có cùng tên chuẩn hóa để tối ưu dung lượng database.</p>
              <button
                onClick={handleAdminMerge}
                disabled={loading}
                className="w-full py-3 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all"
              >
                {loading ? <Loader2 className="animate-spin w-4 h-4" /> : null}
                Merge Duplicates
              </button>
            </div>
          </div>
        )}

        {/* ─── CATEGORIES ADMIN ─────────────────────────────────────────────────────── */}
        {activeTab === "categories" && isAdmin && (
          <CategoriesAdmin supabase={supabase} />
        )}

        {/* ─── FOCUS MODES ADMIN ────────────────────────────────────────────────────── */}
        {activeTab === "focus-modes" && isAdmin && (
          <FocusModesAdmin />
        )}
      </div>

      {/* Toast notification */}
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
    </div>
  );
}