"use client";

import { motion } from "framer-motion";

interface DifficultyBadgeProps {
  avgRating: number | null;
  totalVotes?: number;
  className?: string;
  showIcon?: boolean;
}

export function DifficultyBadge({ avgRating, totalVotes = 0, className = "", showIcon = true }: DifficultyBadgeProps) {
  // Mean < 1.66 = "Easy"
  // Mean 1.66 - 2.33 = "Medium"
  // Mean > 2.33 = "Hard"

  let label = "Chưa đánh giá";
  let colorClass = "bg-slate-800/50 text-slate-400 border-slate-700/50";
  let dotClass = "bg-slate-500";
  let glowClass = "group-hover:shadow-[0_0_8px_rgba(148,163,184,0.3)]";

  if (avgRating !== null && totalVotes > 0) {
    if (avgRating < 1.66) {
      label = "Dễ";
      colorClass = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
      dotClass = "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]";
      glowClass = "group-hover:shadow-[0_0_12px_rgba(16,185,129,0.4)]";
    } else if (avgRating <= 2.33) {
      label = "Vừa";
      colorClass = "bg-amber-500/10 text-amber-400 border-amber-500/20";
      dotClass = "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]";
      glowClass = "group-hover:shadow-[0_0_12px_rgba(245,158,11,0.4)]";
    } else {
      label = "Khó";
      colorClass = "bg-rose-500/10 text-rose-400 border-rose-500/20";
      dotClass = "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]";
      glowClass = "group-hover:shadow-[0_0_12px_rgba(244,63,94,0.4)]";
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`group relative flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wider transition-all duration-300 ${colorClass} ${glowClass} ${className}`}
      title={totalVotes > 0 ? `Dựa trên ${totalVotes} lượt đánh giá` : "Chưa có đánh giá nào"}
    >
      {showIcon && (
        <span className={`w-1.5 h-1.5 rounded-full ${dotClass} animate-pulse`} />
      )}
      <span>{label}</span>
      
      {totalVotes > 0 && (
        <span className="ml-0.5 opacity-50 font-medium normal-case">({totalVotes})</span>
      )}
    </motion.div>
  );
}
