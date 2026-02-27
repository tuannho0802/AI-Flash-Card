export type CategoryColorParams = {
  bg: string;
  text: string;
  border: string;
};

export const COLOR_MAP: Record<string, CategoryColorParams> = {
  blue: { bg: "bg-blue-500/20", text: "text-blue-300", border: "border-blue-500/30" },
  green: { bg: "bg-green-500/20", text: "text-green-300", border: "border-green-500/30" },
  emerald: { bg: "bg-emerald-500/20", text: "text-emerald-300", border: "border-emerald-500/30" },
  amber: { bg: "bg-amber-500/20", text: "text-amber-300", border: "border-amber-500/30" },
  purple: { bg: "bg-purple-500/20", text: "text-purple-300", border: "border-purple-500/30" },
  cyan: { bg: "bg-cyan-500/20", text: "text-cyan-300", border: "border-cyan-500/30" },
  rose: { bg: "bg-rose-500/20", text: "text-rose-300", border: "border-rose-500/30" },
  pink: { bg: "bg-pink-500/20", text: "text-pink-300", border: "border-pink-500/30" },
  orange: { bg: "bg-orange-500/20", text: "text-orange-300", border: "border-orange-500/30" },
  indigo: { bg: "bg-indigo-500/20", text: "text-indigo-300", border: "border-indigo-500/30" },
  slate: { bg: "bg-slate-800/80", text: "text-slate-400", border: "border-slate-700/40" },
  yellow: { bg: "bg-yellow-500/20", text: "text-yellow-300", border: "border-yellow-500/30" },
  red: { bg: "bg-red-500/20", text: "text-red-300", border: "border-red-500/30" },
};

/**
 * Returns Tailwind class string for a category based on the new DB color system.
 * This function also contains legacy fallback logic until all old usages are fully replaced.
 */
export function getCategoryColor(colorOrCategoryKeyword?: string | null): string {
  if (!colorOrCategoryKeyword) return "bg-slate-800/80 text-slate-400 border-slate-700/40";

  // Checking if it matches directly in COLOR_MAP
  if (COLOR_MAP[colorOrCategoryKeyword]) {
    const c = COLOR_MAP[colorOrCategoryKeyword];
    return `${c.bg} ${c.text} ${c.border}`;
  }

  // Legacy fallback string matching (to ensure backwards compatibility during migration)
  const cat = colorOrCategoryKeyword.toLowerCase();

  if (cat.includes("lập trình") || cat.includes("công nghệ") || cat.includes("tech") || cat.includes("code"))
    return "bg-blue-500/20 text-blue-300 border-blue-500/30";

  if (cat.includes("tiếng") || cat.includes("ngôn ngữ") || cat.includes("english"))
    return "bg-green-500/20 text-green-300 border-green-500/30";

  if (cat.includes("lịch sử") || cat.includes("địa lý"))
    return "bg-amber-500/20 text-amber-300 border-amber-500/30";

  if (cat.includes("khoa học") || cat.includes("vật lý") || cat.includes("hóa"))
    return "bg-purple-500/20 text-purple-300 border-purple-500/30";

  if (cat.includes("toán"))
    return "bg-cyan-500/20 text-cyan-300 border-cyan-500/30";

  if (cat.includes("y tế") || cat.includes("sinh học"))
    return "bg-rose-500/20 text-rose-300 border-rose-500/30";

  if (cat.includes("kinh") || cat.includes("tài chính"))
    return "bg-orange-500/20 text-orange-300 border-orange-500/30";

  // Generic
  return "bg-indigo-500/20 text-indigo-300 border-indigo-500/30";
}
