"use client";

import { Home, BarChart2, Library, Shield, X, BrainCircuit, Menu } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export type SidebarTab = "home" | "analytics" | "library" | "admin";

interface AppSidebarProps {
  activeTab: SidebarTab;
  setActiveTab: (tab: SidebarTab) => void;
  isAdmin: boolean;
  isMobileOpen: boolean;
  onMobileClose: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

function NavItem({
  icon: Icon,
  label,
  isActive,
  isAdmin: adminStyle,
  onClick,
  isCollapsed,
}: {
  icon: React.ElementType;
  label: string;
  isActive: boolean;
  isAdmin?: boolean;
  onClick: () => void;
  isCollapsed: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={isCollapsed ? label : undefined}
      className={`w-full flex items-center px-3 py-2.5 rounded-xl text-sm font-medium transition-all border ${
        isCollapsed ? "justify-center" : "gap-3"
      } ${
        isActive
          ? adminStyle
            ? "bg-amber-500/20 text-amber-300 border-amber-500/30 shadow-[0_0_12px_rgba(245,158,11,0.1)]"
            : "bg-indigo-500/20 text-indigo-300 border-indigo-500/30 shadow-[0_0_12px_rgba(99,102,241,0.15)]"
          : "text-slate-400 hover:bg-slate-800/60 hover:text-white border-transparent"
      }`}
    >
      <Icon className="w-4 h-4 flex-shrink-0" />
      {!isCollapsed && <span className="truncate">{label}</span>}
    </button>
  );
}

function SidebarContent({
  activeTab,
  setActiveTab,
  isAdmin,
  onClose,
  isCollapsed,
  onToggleCollapse,
}: AppSidebarProps & { onClose?: () => void }) {
  const navigate = (tab: SidebarTab) => {
    setActiveTab(tab);
    onClose?.();
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Logo & Toggle */}
      <div className={`flex items-center px-4 py-5 border-b border-slate-800/80 ${isCollapsed ? "justify-center" : "justify-between"}`}>
        <div className="flex items-center gap-2.5 overflow-hidden">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center shadow-[0_0_12px_rgba(99,102,241,0.4)] shrink-0">
            <BrainCircuit className="w-4 h-4 text-white" />
          </div>
          {!isCollapsed && (
            <span className="font-bold text-white tracking-tight text-sm truncate">AI Flashcards</span>
          )}
        </div>
        
        <button
          onClick={onToggleCollapse}
          className={`text-slate-500 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors shrink-0 ${isCollapsed ? "hidden" : "hidden md:block"}`}
        >
          <Menu className="w-4 h-4" />
        </button>

        {onClose && (
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors md:hidden"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto overflow-x-hidden">
        <p className={`text-[10px] font-bold text-slate-600 uppercase tracking-widest px-2 mb-2 mt-1 ${isCollapsed ? "text-center" : ""}`}>
          {isCollapsed ? "···" : "Chung"}
        </p>
        <NavItem
          icon={Home}
          label="Trang chủ"
          isActive={activeTab === "home"}
          onClick={() => navigate("home")}
          isCollapsed={isCollapsed}
        />
        <NavItem
          icon={BarChart2}
          label="Thống kê"
          isActive={activeTab === "analytics"}
          onClick={() => navigate("analytics")}
          isCollapsed={isCollapsed}
        />
        <NavItem
          icon={Library}
          label="Thư viện công khai"
          isActive={activeTab === "library"}
          onClick={() => navigate("library")}
          isCollapsed={isCollapsed}
        />

        {isAdmin && (
          <>
            <div className="my-3 border-t border-slate-800/80" />
            <p className={`text-[10px] font-bold text-amber-600/70 uppercase tracking-widest px-2 mb-2 ${isCollapsed ? "text-center" : ""}`}>
              {isCollapsed ? "!" : "Admin"}
            </p>
            <NavItem
              icon={Shield}
              label="Quản lý & Công cụ"
              isActive={activeTab === "admin"}
              isAdmin
              onClick={() => navigate("admin")}
              isCollapsed={isCollapsed}
            />
          </>
        )}
      </nav>

      {/* Toggle button when collapsed */}
      {isCollapsed && (
        <div className="p-3 border-t border-slate-800/80 flex justify-center">
          <button
            onClick={onToggleCollapse}
            className="text-slate-500 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <Menu className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Footer note */}
      <div className="p-4 border-t border-slate-800/80 shrink-0">
        {!isCollapsed ? (
          <p className="text-[10px] text-slate-600 text-center">v2.0 · AI Flashcards</p>
        ) : (
          <p className="text-[10px] text-slate-700 text-center font-bold">V2</p>
        )}
      </div>
    </div>
  );
}

export default function AppSidebar(props: AppSidebarProps) {
  return (
    <>
      {/* Desktop — persistent sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: props.isCollapsed ? 64 : 224 }}
        className="hidden md:flex flex-col shrink-0 h-full bg-slate-900/70 backdrop-blur-xl border-r border-slate-800/60 overflow-hidden"
      >
        <SidebarContent {...props} />
      </motion.aside>

      {/* Mobile — slide-in drawer */}
      <AnimatePresence>
        {props.isMobileOpen && (
          <>
            <motion.div
              key="overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={props.onMobileClose}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] md:hidden"
            />
            <motion.aside
              key="drawer"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="fixed left-0 top-0 bottom-0 w-64 z-[210] bg-slate-900 border-r border-slate-800 flex flex-col md:hidden"
            >
              <SidebarContent {...props} isCollapsed={false} onClose={props.onMobileClose} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
