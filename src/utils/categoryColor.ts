/**
 * Returns Tailwind class string for a category badge color.
 * Uses keyword matching on common Vietnamese and English category names.
 */
export function getCategoryColor(category?: string | null): string {
  if (!category || category === "Chưa phân loại") {
    return "bg-slate-800/80 text-slate-400 border-slate-700/40";
  }
  const cat = category.toLowerCase();

  if (cat.includes("lập trình") || cat.includes("công nghệ") || cat.includes("programming") || cat.includes("software") || cat.includes("code") || cat.includes("tech"))
    return "bg-blue-500/20 text-blue-300 border-blue-500/30";

  if (cat.includes("tiếng") || cat.includes("ngôn ngữ") || cat.includes("english") || cat.includes("language") || cat.includes("văn học") || cat.includes("literature"))
    return "bg-green-500/20 text-green-300 border-green-500/30";

  if (cat.includes("lịch sử") || cat.includes("history") || cat.includes("địa lý") || cat.includes("geography"))
    return "bg-amber-500/20 text-amber-300 border-amber-500/30";

  if (cat.includes("khoa học") || cat.includes("science") || cat.includes("vật lý") || cat.includes("hóa") || cat.includes("physics") || cat.includes("chemistry"))
    return "bg-purple-500/20 text-purple-300 border-purple-500/30";

  if (cat.includes("toán") || cat.includes("math") || cat.includes("thống kê") || cat.includes("statistics"))
    return "bg-cyan-500/20 text-cyan-300 border-cyan-500/30";

  if (cat.includes("y tế") || cat.includes("sinh học") || cat.includes("biology") || cat.includes("health") || cat.includes("y học"))
    return "bg-rose-500/20 text-rose-300 border-rose-500/30";

  if (cat.includes("kinh") || cat.includes("business") || cat.includes("tài chính") || cat.includes("finance"))
    return "bg-orange-500/20 text-orange-300 border-orange-500/30";

  // Generic categorized — use indigo
  return "bg-indigo-500/20 text-indigo-300 border-indigo-500/30";
}
