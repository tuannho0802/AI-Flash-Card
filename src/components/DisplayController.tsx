"use client";
import {
  LayoutGrid,
  AppWindow,
  List,
  LucideIcon,
} from "lucide-react";

export type DisplayMode =
  | "grid"
  | "study"
  | "list";

interface DisplayControllerProps {
  currentMode: DisplayMode;
  onModeChange: (mode: DisplayMode) => void;
}

export default function DisplayController({
  currentMode,
  onModeChange,
}: DisplayControllerProps) {
  const modes: {
    id: DisplayMode;
    icon: LucideIcon;
    label: string;
  }[] = [
    {
      id: "grid",
      icon: LayoutGrid,
      label: "Grid View",
    },
    {
      id: "study",
      icon: AppWindow,
      label: "Study Mode",
    },
    {
      id: "list",
      icon: List,
      label: "List View",
    },
  ];

  return (
    <div className="flex items-center bg-gray-100 dark:bg-gray-800 p-1.5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-inner">
      {modes.map((mode) => {
        const isActive =
          currentMode === mode.id;
        const Icon = mode.icon;
        return (
          <button
            key={mode.id}
            onClick={() =>
              onModeChange(mode.id)
            }
            className={`relative flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              isActive
                ? "bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-300 shadow-sm ring-1 ring-black/5 dark:ring-white/10"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-200/50 dark:hover:bg-gray-700/50"
            }`}
            title={mode.label}
          >
            <Icon
              className={`w-4 h-4 ${isActive ? "stroke-[2.5px]" : "stroke-2"}`}
            />
            <span className="hidden sm:inline">
              {mode.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
