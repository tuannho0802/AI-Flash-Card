"use client";

import {
  LayoutGrid,
  AppWindow,
  List,
  LucideIcon,
  Shuffle,
  Sparkles,
  Lamp,
} from "lucide-react";
import { motion } from "framer-motion";

export type DisplayMode =
  | "grid"
  | "study"
  | "list";

interface DisplayControllerProps {
  currentMode: DisplayMode;
  onModeChange: (mode: DisplayMode) => void;
  onShuffle: () => void;
  onGenerateNew: () => void;
  loadingNew?: boolean;
  onToggleFocus: () => void;
  isFocusMode: boolean;
}

export default function DisplayController({
  currentMode,
  onModeChange,
  onShuffle,
  onGenerateNew,
  loadingNew = false,
  onToggleFocus,
  isFocusMode,
}: DisplayControllerProps) {
  const modes: {
    id: DisplayMode;
    icon: LucideIcon;
    label: string;
  }[] = [
    {
      id: "grid",
      icon: LayoutGrid,
      label: "Grid",
    },
    {
      id: "study",
      icon: AppWindow,
      label: "Study",
    },
    {
      id: "list",
      icon: List,
      label: "List",
    },
  ];

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, scale: 0.9 },
    visible: { opacity: 1, scale: 1 },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="flex flex-wrap items-center gap-4 bg-slate-900/80 backdrop-blur-md p-2 rounded-xl border border-slate-700/50 shadow-xl w-fit mx-auto"
    >
      {/* Primary Actions Group */}
      <div className="flex items-center gap-2 pr-4 border-r border-slate-700/50">
        <motion.button
          variants={itemVariants}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={onToggleFocus}
          className={`p-2 rounded-lg transition-colors ${
            isFocusMode
              ? "bg-yellow-500/20 text-yellow-400 ring-1 ring-yellow-500/50"
              : "text-slate-400 hover:text-white hover:bg-slate-800"
          }`}
          title="Toggle Focus Mode"
        >
          <Lamp
            className={`w-5 h-5 ${isFocusMode ? "fill-yellow-400/20" : ""}`}
          />
        </motion.button>

        {/* Hide extra actions in Focus Mode to reduce distractions */}
        {!isFocusMode && (
          <>
            <motion.button
              variants={itemVariants}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onGenerateNew}
              disabled={loadingNew}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-linear-to-r from-indigo-500 to-purple-500 text-white font-medium shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loadingNew ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              <span>
                {loadingNew ? "Generating..." : "Generate New"}
              </span>
            </motion.button>
    
            <motion.button
              variants={itemVariants}
              whileHover={{
                scale: 1.05,
                backgroundColor: "rgba(30, 41, 59, 0.8)",
              }}
              whileTap={{ scale: 0.95 }}
              onClick={onShuffle}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-slate-300 hover:text-white transition-colors"
            >
              <Shuffle className="w-4 h-4" />
              <span>Shuffle Cards</span>
            </motion.button>
          </>
        )}
      </div>

      {/* View Modes Group */}
      <div className="flex items-center gap-1">
        {modes.map((mode) => {
          const isActive =
            currentMode === mode.id;
          const Icon = mode.icon;
          return (
            <motion.button
              key={mode.id}
              variants={itemVariants}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() =>
                onModeChange(mode.id)
              }
              className={`relative flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                isActive
                  ? "bg-slate-800 text-indigo-400 shadow-inner ring-1 ring-indigo-500/30"
                  : "text-slate-500 hover:text-slate-200 hover:bg-slate-800/50"
              }`}
              title={mode.label}
            >
              <Icon
                className={`w-4 h-4 ${isActive ? "stroke-[2.5px]" : "stroke-2"}`}
              />
              <span className="hidden sm:inline">
                {mode.label}
              </span>
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  );
}
