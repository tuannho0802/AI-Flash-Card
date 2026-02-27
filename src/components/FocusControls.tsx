"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import * as LucideIcons from "lucide-react";
import {
  Play,
  Pause,
  SkipForward,
  Volume2,
  VolumeX,
  Clock,
  Minimize2,
  X,
  Link as LinkIcon,
  Check,
  RefreshCcw,
  RotateCcw,
  AlertTriangle,
  Music,
} from "lucide-react";
import { FALLBACK_MOODS, Mood, MoodConfig } from "@/utils/musicConfig";
import { useFocusMoods } from "@/hooks/useFocusMoods";

interface FocusControlsProps {
  onExitFocus: () => void;
  isFocusMode: boolean;
}

export default function FocusControls({ onExitFocus, isFocusMode }: FocusControlsProps) {
  const { moods } = useFocusMoods();

  // Audio State
  const [activeMoodId, setActiveMoodId] = useState<Mood>("Lo-Fi");
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.5);
  const [isMuted, setIsMuted] = useState(false);

  // Pomodoro State
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [timerActive, setTimerActive] = useState(false);

  // UI State
  const [showMoodMenu, setShowMoodMenu] = useState(false);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customUrl, setCustomUrl] = useState("");
  const [tempUrl, setTempUrl] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorCount, setErrorCount] = useState(0);
  const [showAutoplayTip, setShowAutoplayTip] = useState(false);
  const [poolIndex, setPoolIndex] = useState(0);
  const [allSourcesFailed, setAllSourcesFailed] = useState(false);

  // Increment this key whenever we want to force iframe re-mount (on ID rotation)
  const [iframeKey, setIframeKey] = useState(0);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const fallbackTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hasRestored = useRef(false);

  const currentMood = moods.find((m: MoodConfig) => m.id === activeMoodId) || moods[0] || FALLBACK_MOODS[0];

  // --- YouTube URL helpers ---
  const getYouTubeId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11 ? match[2] : null;
  };

  const isYouTubeSource =
    currentMood.type === "youtube_video" ||
    (activeMoodId === "Custom" && !!getYouTubeId(customUrl));

  // Get the active track ID (from pool or custom)
  // Safety: Ensure poolIndex is within bounds if URLs array changed via Supabase sync
  const safePoolIndex = currentMood.urls.length > 0 ? poolIndex % currentMood.urls.length : 0;

  const currentTrackId =
    activeMoodId === "Custom"
      ? getYouTubeId(customUrl)
      : currentMood.type === "youtube_video"
        ? currentMood.urls[safePoolIndex]
        : null;

  // Build optimized embed URL — single video only, no playlists
  const getEmbedUrl = useCallback((id: string | null) => {
    if (!id) return "";
    // Use URLSearchParams for clean, reliable query string construction
    const params = new URLSearchParams({
      autoplay: "1",
      mute: "0",
      controls: "0",
      loop: "1",
      playlist: id,        // Required for loop=1 to work on single videos
      origin: typeof window !== "undefined" ? window.location.origin : "",
      modestbranding: "1",
      iv_load_policy: "3",
      enablejsapi: "0",    // Disable JS API — reduces tracking requests uBlock targets
      playsinline: "1",
    });
    return `https://www.youtube-nocookie.com/embed/${id}?${params.toString()}`;
  }, []);

  const currentEmbedUrl = getEmbedUrl(currentTrackId);

  // --- LocalStorage init ---
  useEffect(() => {
    if (moods.length === 0 || hasRestored.current) return;

    const savedMood = localStorage.getItem("focusMood") as Mood;
    if (savedMood && moods.some((m: MoodConfig) => m.id === savedMood)) {
      setActiveMoodId(savedMood);
    }

    const savedVol = localStorage.getItem("focusVolume");
    if (savedVol) setVolume(parseFloat(savedVol));

    const savedCustom = localStorage.getItem("focusCustomUrl");
    if (savedCustom) {
      setCustomUrl(savedCustom);
      setTempUrl(savedCustom);
    }

    hasRestored.current = true;
  }, [moods]);

  // --- Sync audio element volume ---
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  // --- React to mood/source changes ---
  useEffect(() => {
    setErrorCount(0);
    setErrorMessage(null);
    if (audioRef.current) {
      audioRef.current.pause();
    }

    if (activeMoodId === "Custom") {
      const ytId = getYouTubeId(customUrl);
      if (!ytId && audioRef.current && customUrl) {
        // plain MP3 url
        audioRef.current.src = customUrl;
        if (isPlaying) {
          audioRef.current.play().catch(() => setShowAutoplayTip(true));
        }
      }
    } else if (currentMood.type === "mp3" && currentMood.urls[0]) {
      if (audioRef.current) {
        audioRef.current.src = currentMood.urls[0];
        if (isPlaying) {
          audioRef.current.play().catch(() => setShowAutoplayTip(true));
        }
      }
    }
    // YouTube types handled by iframe — nothing extra to do here
    setAllSourcesFailed(false);   // Always reset when mood/source changes
    setIframeKey((k) => k + 1);  // New track = new iframe
    localStorage.setItem("focusMood", activeMoodId);
  }, [activeMoodId, customUrl, currentMood, poolIndex]);

  // --- 6-second fallback timeout for YouTube playback ---
  useEffect(() => {
    if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current);
    if (isPlaying && isYouTubeSource) {
      fallbackTimerRef.current = setTimeout(() => {
        // Only warn; don't auto-stop. Let user decide.
        setShowAutoplayTip(true);
      }, 6000);
    } else {
      setShowAutoplayTip(false);
    }
    return () => {
      if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current);
    };
  }, [isPlaying, currentEmbedUrl]);

  // --- Play/Pause ---
  const togglePlay = () => {
    if (currentMood.id === "Silence") return;
    if (activeMoodId === "Custom" && !customUrl) {
      setShowCustomInput(true);
      return;
    }

    if (isPlaying) {
      audioRef.current?.pause();
      setIsPlaying(false);
      setShowAutoplayTip(false);
    } else {
      const isCustomMp3 = activeMoodId === "Custom" && !getYouTubeId(customUrl);
      if (isCustomMp3 || currentMood.type === "mp3") {
        audioRef.current?.play().catch(() => setShowAutoplayTip(true));
      }
      setIsPlaying(true);
      setShowAutoplayTip(false);
    }
  };

  const nextMood = () => {
    // First try rotating within the current mood's pool
    if (
      activeMoodId !== "Custom" &&
      currentMood.type === "youtube_video" &&
      currentMood.urls.length > 1
    ) {
      setPoolIndex((prev) => prev + 1);
      return;
    }
    // Otherwise move to next mood
    const currentIndex = moods.findIndex((m: MoodConfig) => m.id === activeMoodId);
    let nextIndex = (currentIndex + 1) % moods.length;
    if (moods[nextIndex].id === "Silence") nextIndex = (nextIndex + 1) % moods.length;
    setActiveMoodId(moods[nextIndex].id);
    setPoolIndex(0);
    setAllSourcesFailed(false);
  };

  // Called by the iframe's onError — silently rotates to the next ID in the pool
  const handleIframeError = () => {
    if (activeMoodId === "Custom") return; // Don't rotate custom URLs automatically
    const pool = currentMood.urls;
    const nextIndex = poolIndex + 1;
    if (nextIndex < pool.length) {
      // Silently switch to next ID — user won't notice
      setPoolIndex(nextIndex);
      setIframeKey((k) => k + 1); // Force iframe re-mount
    } else {
      // All IDs in this mood's pool are exhausted
      setAllSourcesFailed(true);
      setIsPlaying(false);
      setErrorMessage(`Tất cả nguồn nhạc của "${currentMood.label}" không khả dụng. Hãy thử Mood khác.`);
    }
  };

  // --- Pomodoro ---
  const toggleTimer = () => setTimerActive((t) => !t);
  const resetTimer = () => {
    setTimerActive(false);
    setTimeLeft(25 * 60);
  };

  useEffect(() => {
    if (timerActive && timeLeft > 0) {
      timerRef.current = setInterval(() => setTimeLeft((p) => p - 1), 1000);
    } else if (timeLeft === 0 && timerActive) {
      setTimerActive(false);
      if (Notification.permission === "granted") {
        new Notification("Pomodoro Hoàn tất!", {
          body: "Đã hết 25 phút tập trung, hãy nghỉ ngơi một chút nhé!",
          icon: "/favicon.ico",
        });
      } else {
        alert("Pomodoro Hoàn tất! Hãy nghỉ ngơi một chút nhé.");
      }
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [timerActive, timeLeft]);

  useEffect(() => {
    if ("Notification" in window && Notification.permission !== "granted" && Notification.permission !== "denied") {
      Notification.requestPermission();
    }
  }, []);

  // --- M key shortcut ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (["INPUT", "TEXTAREA"].includes(document.activeElement?.tagName || "")) return;
      if (e.key.toLowerCase() === "m" && isFocusMode) {
        e.preventDefault();
        togglePlay();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFocusMode, isPlaying, currentMood]);

  // Cleanup on unmount
  useEffect(() => {
    return () => { audioRef.current?.pause(); };
  }, []);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const getMoodIcon = (iconName: string) => {
    const IconComponent = (LucideIcons as any)[iconName] || Music;
    return <IconComponent className="w-4 h-4" />;
  };

  const handleApplyCustomUrl = () => {
    setCustomUrl(tempUrl);
    localStorage.setItem("focusCustomUrl", tempUrl);
    setShowCustomInput(false);
    setErrorMessage(null);
    setErrorCount(0);
    if (!isPlaying) setIsPlaying(true);
  };

  const handleResetCustomUrl = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCustomUrl("");
    setTempUrl("");
    localStorage.removeItem("focusCustomUrl");
    setShowCustomInput(true);
    if (activeMoodId === "Custom") {
      setIsPlaying(false);
      audioRef.current?.pause();
    }
  };

  const handleAudioError = () => {
    if (errorCount >= 2) {
      setErrorMessage("Nguồn âm thanh không khả dụng. Bạn có muốn thử nguồn dự phòng không?");
      setIsPlaying(false);
      return;
    }
    setErrorMessage("Đang thử kết nối lại...");
    setErrorCount((prev) => prev + 1);
    setTimeout(() => {
      setErrorMessage(null);
      if (activeMoodId !== "Custom") nextMood();
    }, 2000);
  };

  const trySecondarySource = () => {
    setErrorCount(0);
    setErrorMessage(null);
    nextMood();
  };

  // --- Autohide ---
  const [isVisible, setIsVisible] = useState(true);
  const hideTimeout = useRef<NodeJS.Timeout | null>(null);

  const handleMouseMove = useCallback(() => {
    setIsVisible(true);
    if (hideTimeout.current) clearTimeout(hideTimeout.current);
    hideTimeout.current = setTimeout(() => {
      if (!showMoodMenu) setIsVisible(false);
    }, 3000);
  }, [showMoodMenu]);

  useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      if (hideTimeout.current) clearTimeout(hideTimeout.current);
    };
  }, [handleMouseMove]);

  return (
    <>
      {/* Hidden audio element for MP3 playback */}
      <audio ref={audioRef} loop crossOrigin="anonymous" onError={handleAudioError} />

      {/* Ghost Player — 300x200px off-screen, opacity 0.01 so browser treats it as visible.
          pointer-events:none prevents accidental clicks. key forces full re-mount on track change. */}
      {isYouTubeSource && isPlaying && currentEmbedUrl && !allSourcesFailed && (
        <div
          style={{
            position: "fixed",
            top: -100,
            left: -100,
            width: 300,
            height: 200,
            opacity: 0.01,
            pointerEvents: "none",
            zIndex: -9999,
          }}
        >
          <iframe
            key={`${currentEmbedUrl}-${iframeKey}`}  // Rotates on ID failover
            width="300"
            height="200"
            src={currentEmbedUrl}
            allow="autoplay"
            title="focus-ambient-player"
            onError={handleIframeError}
          />
        </div>
      )}

      {/* Error / Alert Message */}
      <AnimatePresence>
        {(errorMessage || showAutoplayTip) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className={`fixed bottom-24 left-1/2 -translate-x-1/2 px-4 py-3 rounded-xl text-xs font-bold shadow-2xl z-[120] border backdrop-blur-md flex flex-col items-center gap-2 text-center max-w-[300px] ${showAutoplayTip
              ? "bg-amber-500/90 border-amber-400 text-amber-950"
              : "bg-rose-500/90 border-rose-400 text-white"
              }`}
          >
            {showAutoplayTip ? (
              <>
                <div className="flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <p>Âm nhạc đang gặp chút trục trặc do trình chặn quảng cáo.</p>
                </div>
                <button
                  onClick={() => { setShowAutoplayTip(false); setIsPlaying(false); setTimeout(togglePlay, 200); }}
                  className="px-4 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg border border-white/20 transition-colors"
                >
                  Nhấn để phát lại
                </button>
              </>
            ) : (
              <>
                <p>{errorMessage}</p>
                {errorCount >= 2 && activeMoodId !== "Custom" && (
                  <button
                    onClick={trySecondarySource}
                    className="mt-1 flex items-center gap-1.5 px-3 py-1 bg-white/20 hover:bg-white/30 rounded-lg border border-white/20 transition-colors"
                  >
                    <RefreshCcw className="w-3 h-3" /> Thử nguồn dự phòng
                  </button>
                )}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[110] flex items-center gap-4 bg-slate-900/80 backdrop-blur-xl border border-white/10 p-3 rounded-2xl shadow-2xl"
            onMouseEnter={() => setIsVisible(true)}
          >
            {/* Pomodoro Timer */}
            <div className="flex items-center gap-2 bg-slate-800/50 rounded-xl px-3 py-1.5 border border-slate-700/50">
              <button
                onClick={toggleTimer}
                className={`transition-colors ${timerActive ? "text-rose-400 hover:text-rose-300" : "text-slate-400 hover:text-white"}`}
                title="Bật/Tắt Pomodoro"
              >
                <Clock className={`w-4 h-4 ${timerActive ? "animate-pulse" : ""}`} />
              </button>
              <span
                className="text-sm font-mono font-bold text-slate-200 tabular-nums select-none"
                onDoubleClick={resetTimer}
              >
                {formatTime(timeLeft)}
              </span>
            </div>

            <div className="w-px h-6 bg-slate-700/50" />

            {/* Ambient Player */}
            <div className="flex items-center gap-3 relative">
              {/* Mood Selector Trigger — div to avoid nested-button HTML error */}
              <div
                onClick={() => setShowMoodMenu(!showMoodMenu)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800/50 hover:bg-slate-700/50 text-indigo-300 transition-colors border border-slate-700/50 cursor-pointer select-none"
              >
                {getMoodIcon(currentMood.icon)}
                <span className="text-xs font-bold hidden sm:inline-block">{currentMood.label}</span>
                {activeMoodId === "Custom" && customUrl && (
                  <span
                    onClick={handleResetCustomUrl}
                    className="ml-1 p-1 hover:bg-white/20 rounded-lg text-indigo-200 transition-colors cursor-pointer"
                    title="Đổi Link"
                  >
                    <RotateCcw className="w-3 h-3" />
                  </span>
                )}
              </div>

              {/* Mood Dropdown */}
              <AnimatePresence>
                {showMoodMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute bottom-full left-0 mb-3 w-48 bg-slate-800 border border-slate-700 rounded-xl overflow-hidden shadow-2xl"
                  >
                    {moods.map((mood: MoodConfig) => (
                      <button
                        key={mood.id}
                        onClick={() => {
                          setActiveMoodId(mood.id);
                          setPoolIndex(0);
                          setShowMoodMenu(false);
                          if (mood.id === "Custom" && !customUrl) setShowCustomInput(true);
                          if (!isPlaying) setTimeout(togglePlay, 100);
                        }}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${activeMoodId === mood.id
                          ? "bg-indigo-500/20 text-indigo-300"
                          : "text-slate-300 hover:bg-slate-700/50"
                          }`}
                      >
                        {getMoodIcon(mood.icon)}
                        <span className="text-sm font-medium">{mood.label}</span>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Custom URL Input */}
              <AnimatePresence>
                {showCustomInput && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 10 }}
                    className="absolute bottom-full left-0 mb-3 w-72 bg-slate-900/90 backdrop-blur-xl border border-white/10 p-3 rounded-xl shadow-2xl flex items-center gap-2"
                  >
                    <input
                      type="text"
                      value={tempUrl}
                      onChange={(e) => setTempUrl(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleApplyCustomUrl()}
                      placeholder="Dán link MP3 hoặc YouTube..."
                      className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white outline-none focus:ring-1 focus:ring-indigo-500"
                      autoFocus
                    />
                    <button
                      onClick={handleApplyCustomUrl}
                      className="p-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-white transition-colors"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setShowCustomInput(false)}
                      className="p-2 hover:bg-slate-800 rounded-lg text-slate-400"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Play/Pause */}
              <button
                onClick={togglePlay}
                disabled={currentMood.id === "Silence"}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white transition-all active:scale-95"
              >
                {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
              </button>

              {/* Skip / Next */}
              <button
                onClick={nextMood}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all active:scale-95"
              >
                <SkipForward className="w-4 h-4" />
              </button>

              {/* Volume */}
              <div className="flex items-center gap-2 ml-2 group">
                <button onClick={() => setIsMuted(!isMuted)} className="text-slate-400 hover:text-white">
                  {isMuted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={isMuted ? 0 : volume}
                  onChange={(e) => {
                    setVolume(parseFloat(e.target.value));
                    localStorage.setItem("focusVolume", e.target.value);
                    if (isMuted) setIsMuted(false);
                  }}
                  className="w-0 opacity-0 group-hover:w-20 group-hover:opacity-100 transition-all duration-300 accent-indigo-500 h-1.5 rounded-full bg-slate-700 appearance-none"
                />
              </div>
            </div>

            <div className="w-px h-6 bg-slate-700/50" />

            {/* Exit Focus */}
            <button
              onClick={onExitFocus}
              className="px-3 py-1.5 flex items-center gap-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors border border-rose-500/20"
              title="Exit Focus Mode"
            >
              <Minimize2 className="w-4 h-4" />
              <span className="text-sm font-bold hidden sm:inline-block">Thoát</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
