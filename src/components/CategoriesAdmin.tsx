"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2, Plus, Edit2, Trash2, Tag as TagIcon, LayoutGrid, RefreshCw, CheckCircle } from "lucide-react";
import * as LucideIcons from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Category } from "@/types/flashcard";
import { CategoryBadge } from "./CategoryBadge";
import { COLOR_MAP } from "@/utils/categoryColor";

export default function CategoriesAdmin({ supabase }: { supabase: any }) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: "", icon: "Tag", color: "blue", slug: "" });
  const [saving, setSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    const { data, error: fetchErr } = await supabase
      .from("categories")
      .select("*")
      .order("created_at", { ascending: false });
    
    if (fetchErr) setError(fetchErr.message);
    else setCategories(data || []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const generateSlug = (name: string) => {
    return name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[đĐ]/g, 'd').replace(/([^0-9a-z-\s])/g, '').replace(/(\s+)/g, '-').replace(/-+/g, '-').replace(/^-+|-+$/g, '');
  };

  const handleNameChange = (val: string) => {
    setFormData((prev: any) => ({ ...prev, name: val, slug: generateSlug(val) }));
  };

  const handleEdit = (cat: Category) => {
    setIsEditing(true);
    setEditingId(cat.id);
    setFormData({ name: cat.name, icon: cat.icon, color: cat.color, slug: cat.slug });
  };

  const handleAddNew = () => {
    setIsEditing(true);
    setEditingId(null);
    setFormData({ name: "", icon: "Tag", color: "blue", slug: "" });
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditingId(null);
  };

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.slug.trim()) return;
    setSaving(true);
    
    if (editingId) {
      // Update
      const { error: updErr } = await supabase.from("categories").update(formData).eq("id", editingId);
      if (updErr) alert("Lỗi cập nhật: " + updErr.message);
      else {
        setIsEditing(false);
        fetchCategories();
      }
    } else {
      // Insert
      const { error: insErr } = await supabase.from("categories").insert([formData]);
      if (insErr) alert("Lỗi thêm mới: " + insErr.message);
      else {
        setIsEditing(false);
        fetchCategories();
      }
    }
    setSaving(false);
  };

  const handleDelete = async (cat: Category) => {
    // Check usage
    const { count, error: countErr } = await supabase.from("flashcard_sets").select("*", { count: "exact", head: true }).eq("category_id", cat.id);
    if (countErr) {
      alert("Lỗi kiểm tra dữ liệu: " + countErr.message);
      return;
    }
    if (count && count > 0) {
      alert(`Không thể xóa! Danh mục này đang được sử dụng bởi ${count} bộ thẻ. Vui lòng chuyển các bộ thẻ sang danh mục khác trước.`);
      return;
    }

    if (!confirm(`Bạn có chắc chắn muốn xóa danh mục "${cat.name}"?`)) return;

    const { error: delErr } = await supabase.from("categories").delete().eq("id", cat.id);
    if (delErr) alert("Lỗi xóa: " + delErr.message);
    else fetchCategories();
  };

  const handleSyncLegacyData = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch("/api/admin/migrate-categories", { method: "POST" });
      const data = await res.json();
      
      if (res.ok) {
        setToast(data.summary || `Đã đồng bộ thành công ${data.setsUpdatedCount || 0} bản ghi`);
        setTimeout(() => setToast(null), 8000);
        fetchCategories(); // Refresh list to see if new categories were created
      } else {
        alert("Lỗi đồng bộ: " + (data.error || "Unknown error"));
      }
    } catch (err: any) {
      alert("Lỗi kết nối: " + err.message);
    } finally {
      setIsSyncing(false);
    }
  };

  // Common icons for fast pick
  const commonIcons = ["Tag", "Code", "Brain", "Heart", "Globe", "Microscope", "BookOpen", "Cpu", "Briefcase", "Music", "Languages", "Calculator", "Palette"];

  if (loading) {
    return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-indigo-400" /></div>;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">Quản lý Danh mục</h1>
          <p className="text-slate-400 mt-1 text-sm">Thêm, sửa, xóa các danh mục trong cơ sở dữ liệu</p>
        </div>
        {!isEditing && (
          <div className="flex gap-2">
            <button 
              onClick={handleSyncLegacyData} 
              disabled={isSyncing}
              className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-slate-200 px-4 py-2 rounded-xl transition-colors font-medium border border-slate-600 disabled:opacity-50"
            >
              {isSyncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              Kiểm tra & Sửa lỗi đồng bộ
            </button>
            <button onClick={handleAddNew} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl transition-colors font-medium">
              <Plus className="w-4 h-4" /> Thêm Mới
            </button>
          </div>
        )}
      </div>

      {isEditing && (
        <div className="bg-slate-800/80 p-6 rounded-2xl border border-indigo-500/30 shadow-xl space-y-4 animate-in fade-in slide-in-from-top-4">
          <h2 className="text-lg font-bold text-white">{editingId ? "Sửa Danh mục" : "Thêm Danh mục mới"}</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Tên danh mục</label>
              <input value={formData.name} onChange={e => handleNameChange(e.target.value)} className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white outline-none focus:border-indigo-500" placeholder="e.g. Tâm lý học" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Slug</label>
              <input value={formData.slug} onChange={e => setFormData(p => ({ ...p, slug: e.target.value }))} className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-400 outline-none" disabled />
            </div>
          </div>

          <div>
             <label className="block text-sm font-medium text-slate-300 mb-2">Icon</label>
             <div className="flex flex-wrap gap-2">
                {commonIcons.map(ic => {
                  const IconComp = (LucideIcons as any)[ic] || LucideIcons.Tag;
                  return (
                    <button key={ic} onClick={() => setFormData((p: any) => ({ ...p, icon: ic }))} className={`p-2 rounded-lg border flex items-center gap-2 ${formData.icon === ic ? "bg-indigo-500/20 border-indigo-500 text-indigo-300" : "bg-slate-900 border-slate-700 text-slate-400 hover:bg-slate-700"}`} title={ic}>
                      <IconComp className="w-4 h-4" />
                    </button>
                  );
                })}
             </div>
             <p className="text-xs text-slate-500 mt-2">Gợi ý. Bạn cũng có thể nhập tên Icon từ lucide-react nếu biết rõ.</p>
          </div>

          <div>
             <label className="block text-sm font-medium text-slate-300 mb-2">Màu sắc</label>
             <div className="flex flex-wrap gap-2">
                {Object.keys(COLOR_MAP).map(color => (
                  <button key={color} onClick={() => setFormData(p => ({ ...p, color }))} className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${COLOR_MAP[color].bg} ${COLOR_MAP[color].text} ${COLOR_MAP[color].border} ${formData.color === color ? "ring-2 ring-white ring-offset-2 ring-offset-slate-800" : "opacity-70 hover:opacity-100"}`}>
                    {color}
                  </button>
                ))}
             </div>
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-slate-700">
            <button onClick={handleCancel} disabled={saving} className="px-4 py-2 rounded-xl text-slate-300 hover:bg-slate-700 font-medium">Hủy</button>
            <button onClick={handleSave} disabled={saving || !formData.name} className="flex items-center gap-2 px-6 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium disabled:opacity-50">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Lưu
            </button>
          </div>
        </div>
      )}

      {!isEditing && (
        <div className="bg-slate-800/40 rounded-2xl border border-slate-700/50 overflow-hidden">
          <table className="w-full text-left text-sm text-slate-400">
             <thead className="text-xs text-slate-500 uppercase bg-slate-800/80 border-b border-slate-700">
                <tr>
                   <th className="px-6 py-4 font-bold">Danh mục</th>
                   <th className="px-6 py-4 font-bold">Slug</th>
                   <th className="px-6 py-4 font-bold whitespace-nowrap">Ngày tạo</th>
                   <th className="px-6 py-4 font-bold text-right">Thao tác</th>
                </tr>
             </thead>
             <tbody>
               {categories.length === 0 ? (
                 <tr><td colSpan={4} className="px-6 py-8 text-center text-slate-500">Chưa có danh mục nào. Hãy tạo mới hoặc chạy Script Migration.</td></tr>
               ) : categories.map(cat => (
                 <tr key={cat.id} className="border-b border-slate-800 hover:bg-slate-700/20">
                    <td className="px-6 py-4">
                      <CategoryBadge category={cat} />
                    </td>
                    <td className="px-6 py-4 font-mono text-xs">{cat.slug}</td>
                    <td className="px-6 py-4">{new Date(cat.created_at).toLocaleDateString()}</td>
                    <td className="px-6 py-4 flex justify-end gap-2">
                       <button onClick={() => handleEdit(cat)} className="p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-slate-700 rounded transition-colors"><Edit2 className="w-4 h-4" /></button>
                       <button onClick={() => handleDelete(cat)} className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-700 rounded transition-colors"><Trash2 className="w-4 h-4" /></button>
                    </td>
                 </tr>
               ))}
             </tbody>
          </table>
        </div>
      )}

      {/* Toast notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 right-6 bg-emerald-600 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 z-[100] border border-emerald-400/30 font-medium"
          >
            <CheckCircle className="w-5 h-5" />
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
