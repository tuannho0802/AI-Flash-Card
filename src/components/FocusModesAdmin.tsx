"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Loader2,
  Plus,
  Pencil,
  Trash2,
  Save,
  X,
  Music,
  Check,
  AlertCircle,
  GripVertical,
  ExternalLink,
  RefreshCw,
  CheckCircle
} from "lucide-react";
import * as LucideIcons from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface FocusModeRow {
  id: string;
  title: string;
  icon_name: string;
  youtube_id: string[];
  order_index: number;
  is_active: boolean;
  created_at: string;
}

export default function FocusModesAdmin() {
  const [modes, setModes] = useState<FocusModeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    icon_name: "Music",
    order_index: 0,
    is_active: true,
  });
  const [videoPool, setVideoPool] = useState<string[]>([]);
  const [urlInput, setUrlInput] = useState("");

  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const fetchModes = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/focus-modes");
      if (!res.ok) throw new Error("Failed to fetch modes");
      const data = await res.json();
      setModes(data || []);
    } catch (err: any) {
      console.error("Error fetching modes:", err);
      setError(err.message);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchModes();
  }, [fetchModes]);

  const extractYoutubeId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    const id = match && match[2].length === 11 ? match[2] : url.trim();
    return id.length === 11 ? id : null;
  };

  const addVideo = () => {
    if (!urlInput.trim()) return;
    const id = extractYoutubeId(urlInput);
    if (!id) {
      alert("Link hoặc ID YouTube không hợp lệ.");
      return;
    }
    if (videoPool.includes(id)) {
      alert("Video này đã có trong danh sách.");
      return;
    }
    setVideoPool(prev => [...prev, id]);
    setUrlInput("");
  };

  const removeVideo = (id: string) => {
    setVideoPool(prev => prev.filter(v => v !== id));
  };

  const handleEdit = (mode: FocusModeRow) => {
    setEditingId(mode.id);
    setIsEditing(true);
    setFormData({
      title: mode.title,
      icon_name: mode.icon_name,
      order_index: mode.order_index,
      is_active: mode.is_active,
    });
    setVideoPool(mode.youtube_id || []);
    setUrlInput("");
  };

  const handleAddNew = () => {
    setEditingId(null);
    setIsEditing(true);
    setFormData({
      title: "",
      icon_name: "Music",
      order_index: modes.length > 0 ? Math.max(...modes.map(m => m.order_index)) + 1 : 1,
      is_active: true,
    });
    setVideoPool([]);
    setUrlInput("");
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditingId(null);
  };

  const handleSave = async () => {
    if (!formData.title.trim()) return;
    setSaving(true);

    const payload = {
      id: editingId,
      title: formData.title,
      icon_name: formData.icon_name,
      youtube_id: videoPool,
      order_index: formData.order_index,
      is_active: formData.is_active,
    };

    try {
      const method = editingId ? "PUT" : "POST";
      const res = await fetch("/api/admin/focus-modes", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to save");
      }

      setToast(editingId ? "Đã cập nhật thành công!" : "Đã thêm mới thành công!");
      setTimeout(() => setToast(null), 3000);

      setIsEditing(false);
      fetchModes();
    } catch (err: any) {
      alert("Lỗi: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (mode: FocusModeRow) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa mode "${mode.title}" không?`)) return;

    try {
      const res = await fetch(`/api/admin/focus-modes?id=${mode.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to delete");
      }

      fetchModes();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const getIconComp = (name: string) => {
    const Icon = (LucideIcons as any)[name] || Music;
    return <Icon className="w-4 h-4" />;
  };

  const commonIcons = [
    "Music", "Headphones", "CloudRain", "Trees", "Coffee", "Zap", "Sparkles",
    "Moon", "Sun", "Waves", "Wind", "Flame", "Bird", "Ghost", "Focus", "Target"
  ];

  if (loading && modes.length === 0) {
    return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-indigo-400" /></div>;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">Quản lý Focus Mode</h1>
          <p className="text-slate-400 mt-1 text-sm">Quản lý danh sách nhạc và âm thanh tập trung</p>
        </div>
        {!isEditing && (
          <button onClick={handleAddNew} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl transition-colors font-medium shadow-lg shadow-indigo-500/20 active:scale-95">
            <Plus className="w-4 h-4" /> Thêm Mới
          </button>
        )}
      </div>

      {isEditing && (
        <div className="bg-slate-800/80 p-6 rounded-2xl border border-indigo-500/30 shadow-xl space-y-6 animate-in fade-in slide-in-from-top-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">{editingId ? "Sửa Focus Mode" : "Thêm Focus Mode mới"}</h2>
            <button onClick={handleCancel} className="text-slate-500 hover:text-white transition-colors">
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-xs font-black text-indigo-400 uppercase tracking-widest border-l-2 border-indigo-500 pl-3">Thông tin cơ bản</h3>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1.5">Tiêu đề (Title)</label>
                  <input
                    value={formData.title}
                    onChange={e => setFormData(p => ({ ...p, title: e.target.value }))}
                    className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white outline-none focus:border-indigo-500 transition-all font-medium"
                    placeholder="VD: Rainy Day, Deep Lofi..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1.5">Sắp xếp (Order)</label>
                    <input
                      type="number"
                      value={formData.order_index}
                      onChange={e => setFormData(p => ({ ...p, order_index: parseInt(e.target.value) || 0 }))}
                      className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white outline-none focus:border-indigo-500 transition-all font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1.5">Trạng thái</label>
                    <button
                      onClick={() => setFormData(p => ({ ...p, is_active: !p.is_active }))}
                      className={`w-full py-2.5 rounded-xl border transition-all font-bold text-[10px] uppercase tracking-wider ${formData.is_active
                          ? "bg-emerald-500/10 border-emerald-500/50 text-emerald-400"
                          : "bg-rose-500/10 border-rose-500/50 text-rose-400"
                        }`}
                    >
                      {formData.is_active ? "Hoạt động" : "Tạm ẩn"}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">Chọn Icon</label>
                  <div className="flex flex-wrap gap-2 p-3 bg-slate-900/50 rounded-xl border border-slate-700/50">
                    {commonIcons.map(ic => (
                      <button
                        key={ic}
                        onClick={() => setFormData(p => ({ ...p, icon_name: ic }))}
                        className={`p-2.5 rounded-lg border flex items-center transition-all ${formData.icon_name === ic
                            ? "bg-indigo-500 text-white border-indigo-400 shadow-lg shadow-indigo-500/20 scale-110 z-10"
                            : "bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700"
                          }`}
                        title={ic}
                      >
                        {getIconComp(ic)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black text-indigo-400 uppercase tracking-widest border-l-2 border-indigo-500 pl-3">Nguồn nhạc (Playlist)</h3>
                  <span className="text-[10px] text-slate-500 font-bold">{videoPool.length} videos</span>
                </div>

                {/* Smart Input */}
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      value={urlInput}
                      onChange={e => setUrlInput(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && addVideo()}
                      placeholder="Dán link hoặc ID YouTube..."
                      className="w-full pl-4 pr-10 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white outline-none focus:border-indigo-500 transition-all text-sm font-medium"
                    />
                    {urlInput && (
                      <button
                        onClick={() => setUrlInput("")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <button
                    onClick={addVideo}
                    className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-all font-bold text-sm shadow-lg shadow-indigo-500/20 active:scale-95"
                  >
                    Thêm
                  </button>
                </div>

                {/* Visual Source Gallery */}
                <div className="bg-slate-900/50 rounded-2xl border border-slate-700/50 p-4 min-h-[300px] max-h-[400px] overflow-y-auto custom-scrollbar">
                  <div className="grid grid-cols-2 gap-3">
                    <AnimatePresence>
                      {videoPool.length === 0 ? (
                        <div className="col-span-2 flex flex-col items-center justify-center py-12 text-slate-600 space-y-2">
                          <Music className="w-8 h-8 opacity-20" />
                          <p className="text-xs font-medium italic">Chưa có nguồn nhạc nào. Hãy dán link YouTube lên trên.</p>
                        </div>
                      ) : (
                        videoPool.map((id) => (
                          <motion.div
                            key={id}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="relative group rounded-xl overflow-hidden aspect-video border border-slate-800 shadow-lg hover:border-indigo-500/50 transition-all"
                          >
                            <img
                              src={`https://img.youtube.com/vi/${id}/mqdefault.jpg`}
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                              alt="Thumbnail"
                            />
                            <div className="absolute inset-0 bg-linear-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                            <div className="absolute top-1 right-1 flex gap-1 transform translate-y-1 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all">
                              <a
                                href={`https://youtube.com/watch?v=${id}`}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1.5 bg-slate-900/90 text-white hover:bg-indigo-600 rounded-lg backdrop-blur-sm transition-colors"
                                title="Xem video"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                              <button
                                onClick={() => removeVideo(id)}
                                className="p-1.5 bg-slate-900/90 text-white hover:bg-rose-600 rounded-lg backdrop-blur-sm transition-colors"
                                title="Xóa"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            <div className="absolute bottom-2 left-2 truncate text-[10px] font-mono text-white/50 bg-black/40 px-1.5 py-0.5 rounded backdrop-blur-sm group-hover:text-white transition-colors">
                              {id}
                            </div>
                          </motion.div>
                        ))
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-6 flex justify-end gap-3 border-t border-slate-700">
            <button onClick={handleCancel} disabled={saving} className="px-5 py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-700 transition-colors font-bold text-sm">Hủy</button>
            <button
              onClick={handleSave}
              disabled={saving || !formData.title.trim()}
              className="flex items-center gap-2 px-8 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm disabled:opacity-50 transition-all shadow-lg shadow-indigo-500/20"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {editingId ? "Cập nhật" : "Lưu Mode"}
            </button>
          </div>
        </div>
      )}

      {!isEditing && (
        <div className="bg-slate-800/40 rounded-2xl border border-slate-700/50 overflow-hidden shadow-xl">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="text-[10px] text-slate-500 uppercase tracking-widest bg-slate-800/80 border-b border-slate-700">
              <tr>
                <th className="px-6 py-4 font-black">Thứ tự</th>
                <th className="px-6 py-4 font-black">Mood</th>
                <th className="px-6 py-4 font-black text-center">Nguồn (Video)</th>
                <th className="px-6 py-4 font-black">Trạng thái</th>
                <th className="px-6 py-4 font-black text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {modes.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-500 italic">Chưa có Focus Mode nào được tạo.</td></tr>
              ) : modes.map(mode => (
                <tr key={mode.id} className="hover:bg-slate-700/20 transition-colors group">
                  <td className="px-6 py-4 font-mono text-xs text-slate-500">#{mode.order_index}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 flex items-center justify-center bg-slate-800 rounded-xl text-indigo-400 border border-transparent group-hover:border-indigo-500/30 transition-all">
                        {getIconComp(mode.icon_name)}
                      </div>
                      <span className="font-bold text-white tracking-wide">{mode.title}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="inline-flex flex-col items-center gap-1.5">
                      <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-400 text-[10px] font-black rounded uppercase tracking-tighter border border-indigo-500/20">
                        {mode.youtube_id.length} videos
                      </span>
                      <div className="flex -space-x-2">
                        {mode.youtube_id.slice(0, 3).map((id, i) => (
                          <a key={i} href={`https://youtube.com/watch?v=${id}`} target="_blank" rel="noreferrer" className="w-6 h-6 rounded-full border-2 border-slate-900 overflow-hidden hover:z-10 transition-all shadow-lg">
                            <img src={`https://img.youtube.com/vi/${id}/mqdefault.jpg`} className="w-full h-full object-cover" alt="YT" />
                          </a>
                        ))}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${mode.is_active
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                        : "bg-slate-800 text-slate-500 border-slate-700"
                      }`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${mode.is_active ? 'bg-emerald-400 animate-pulse outline outline-emerald-400/50' : 'bg-slate-600'}`} />
                      {mode.is_active ? "Active" : "Hidden"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all">
                      <button onClick={() => handleEdit(mode)} className="p-2 text-slate-400 hover:text-indigo-400 hover:bg-slate-700/50 rounded-lg transition-all"><Pencil className="w-4 h-4" /></button>
                      <button onClick={() => handleDelete(mode)} className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-700/50 rounded-lg transition-all"><Trash2 className="w-4 h-4" /></button>
                    </div>
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
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-8 right-8 bg-indigo-600 text-white px-6 py-4 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] flex items-center gap-3 z-[100] border border-indigo-400/30 font-bold"
          >
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
              <CheckCircle className="w-5 h-5" />
            </div>
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
