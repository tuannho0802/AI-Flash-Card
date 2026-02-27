"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play,
  Pause,
  SkipForward,
  Volume2,
  VolumeX,
  Clock,
  Minimize2,
  Headphones,
  CloudRain,
  Trees,
  Coffee,
  X,
} from "lucide-react";
import { MOODS, MoodConfig, Mood } from "@/utils/musicConfig";

interface FocusControlsProps {
  onExitFocus: () => void;
  isFocusMode: boolean; // to handle keyboard shortcuts or global state if needed
}

export default function FocusControls({ onExitFocus, isFocusMode }: FocusControlsProps) {
  // Audio State
  const [activeMoodId, setActiveMoodId] = useState<Mood>("Lo-Fi");
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.5);
  const [isMuted, setIsMuted] = useState(false);
  
  // Pomodoro State
  const [timeLeft, setTimeLeft] = useState(25 * 60); // 25 minutes
  const [timerActive, setTimerActive] = useState(false);
  
  // UI State
  const [showMoodMenu, setShowMoodMenu] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const currentMood = MOODS.find((m) => m.id === activeMoodId) || MOODS[0];

  // Initialize from LocalStorage
  useEffect(() => {
    const savedMood = localStorage.getItem("focusMood") as Mood;
    if (savedMood && MOODS.some(m => m.id === savedMood)) {
      setActiveMoodId(savedMood);
    }
    const savedVol = localStorage.getItem("focusVolume");
    if (savedVol) {
      setVolume(parseFloat(savedVol));
    }
  }, []);

  // Sync Audio Element
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  useEffect(() => {
    // When mood changes, update source and play if it was already playing
    if (audioRef.current && currentMood.url) {
      audioRef.current.src = currentMood.url;
      if (isPlaying) {
        audioRef.current.play().catch(console.error);
      }
    }
    localStorage.setItem("focusMood", activeMoodId);
  }, [activeMoodId]); // Don't add isPlaying here, to avoid infinite loops

  // Play/Pause Handler
  const togglePlay = () => {
    if (currentMood.id === "Silence" || !currentMood.url) return;
    
    if (isPlaying) {
      audioRef.current?.pause();
      setIsPlaying(false);
    } else {
      audioRef.current?.play().catch(console.error);
      setIsPlaying(true);
    }
  };

  const nextMood = () => {
    const currentIndex = MOODS.findIndex(m => m.id === activeMoodId);
    let nextIndex = (currentIndex + 1) % MOODS.length;
    // Skip silence when shuffling 
    if (MOODS[nextIndex].id === "Silence") {
      nextIndex = (nextIndex + 1) % MOODS.length;
    }
    setActiveMoodId(MOODS[nextIndex].id);
  };

  // Pomodoro Timer Logic
  const toggleTimer = () => {
    setTimerActive(!timerActive);
  };

  const resetTimer = () => {
    setTimerActive(false);
    setTimeLeft(25 * 60);
  };

  useEffect(() => {
    if (timerActive && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && timerActive) {
      // Timer finished
      setTimerActive(false);
      // Play a little chime or just native notification
      if (Notification.permission === "granted") {
        new Notification("Pomodoro Hoàn tất!", {
          body: "Đã hết 25 phút tập trung, hãy nghỉ ngơi một chút nhé!",
          icon: "/favicon.ico"
        });
      } else {
        alert("Pomodoro Hoàn tất! Hãy nghỉ ngơi một chút nhé.");
      }
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timerActive, timeLeft]);

  // Request Notification Permission
  useEffect(() => {
    if ("Notification" in window && Notification.permission !== "granted" && Notification.permission !== "denied") {
      Notification.requestPermission();
    }
  }, []);

  // Global "M" key to toggle music
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

  // Cleanup on unmount (exiting focus mode)
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const getMoodIcon = (iconName: string) => {
    switch(iconName) {
      case "Headphones": return <Headphones className="w-4 h-4" />;
      case "CloudRain": return <CloudRain className="w-4 h-4" />;
      case "Trees": return <Trees className="w-4 h-4" />;
      case "Coffee": return <Coffee className="w-4 h-4" />;
      default: return <VolumeX className="w-4 h-4" />;
    }
  };

  // Autohide logic
  const [isVisible, setIsVisible] = useState(true);
  let hideTimeout = useRef<NodeJS.Timeout | null>(null);
  
  const handleMouseMove = useCallback(() => {
    setIsVisible(true);
    if (hideTimeout.current) clearTimeout(hideTimeout.current);
    hideTimeout.current = setTimeout(() => {
      if (!showMoodMenu) setIsVisible(false); // Only hide if menu is closed
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
      <audio ref={audioRef} loop />
      
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
              <button onClick={toggleTimer} className={`transition-colors ${timerActive ? "text-rose-400 hover:text-rose-300" : "text-slate-400 hover:text-white"}`} title="Bật/Tắt Pomodoro">
                <Clock className={`w-4 h-4 ${timerActive ? "animate-pulse" : ""}`} />
              </button>
              <span className="text-sm font-mono font-bold text-slate-200 tabular-nums select-none" onDoubleClick={resetTimer}>
                {formatTime(timeLeft)}
              </span>
            </div>

            <div className="w-px h-6 bg-slate-700/50" />

            {/* Ambient Player */}
            <div className="flex items-center gap-3 relative">
              {/* Mood Selector Trigger */}
              <button 
                onClick={() => setShowMoodMenu(!showMoodMenu)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800/50 hover:bg-slate-700/50 text-indigo-300 transition-colors border border-slate-700/50"
              >
                {getMoodIcon(currentMood.icon)}
                <span className="text-xs font-bold hidden sm:inline-block">{currentMood.label}</span>
              </button>

              {/* Mood Dropdown */}
              <AnimatePresence>
                {showMoodMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute bottom-full left-0 mb-3 w-48 bg-slate-800 border border-slate-700 rounded-xl overflow-hidden shadow-2xl"
                  >
                    {MOODS.map(mood => (
                      <button
                        key={mood.id}
                        onClick={() => {
                          setActiveMoodId(mood.id);
                          setShowMoodMenu(false);
                          if (!isPlaying && mood.url) {
                            setTimeout(togglePlay, 100);
                          }
                        }}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${activeMoodId === mood.id ? "bg-indigo-500/20 text-indigo-300" : "text-slate-300 hover:bg-slate-700/50"}`}
                      >
                        {getMoodIcon(mood.icon)}
                        <span className="text-sm font-medium">{mood.label}</span>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Controls */}
              <button
                onClick={togglePlay}
                disabled={currentMood.id === "Silence"}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white transition-all active:scale-95"
              >
                {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
              </button>
              
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
