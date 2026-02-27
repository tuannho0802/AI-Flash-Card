import React from 'react';
import * as LucideIcons from 'lucide-react';
import {COLOR_MAP} from '@/utils/categoryColor';

interface CategoryBadgeProps {
  category?: {
    name: string;
    icon: string;
    color: string;
  } | null;
  /** Legacy string category for strict backwards compatibility */
  fallbackName?: string | null;
}

export function CategoryBadge({ category, fallbackName }: CategoryBadgeProps) {
  // Determine display values
  const name = category?.name || fallbackName || "Chưa phân loại";
  const iconName = category?.icon || "Tag";
  let colorKey = category?.color || "slate";

  // If no category relation is provided but we have a fallback, try to determine legacy color 
  // (We use getCategoryColor fallback logic in case it's a legacy component)
  if (!category && fallbackName) {
    if (fallbackName.toLowerCase().includes("tech") || fallbackName.toLowerCase().includes("lập trình") || fallbackName.toLowerCase().includes("công nghệ") || fallbackName.toLowerCase().includes("code")) {
      colorKey = "blue";
    } else if (fallbackName.toLowerCase().includes("tiếng") || fallbackName.toLowerCase().includes("english")) {
      colorKey = "green";
    } else if (fallbackName.toLowerCase().includes("khoa học")) {
      colorKey = "purple";
    } else if (fallbackName.toLowerCase().includes("toán")) {
      colorKey = "cyan";
    } else if (fallbackName.toLowerCase().includes("lịch sử") || fallbackName.toLowerCase().includes("địa lý")) {
      colorKey = "amber";
    } else if (fallbackName.toLowerCase().includes("kinh") || fallbackName.toLowerCase().includes("tài chính")) {
      colorKey = "orange";
    } else if (fallbackName.toLowerCase().includes("y tế") || fallbackName.toLowerCase().includes("sinh học")) {
      colorKey = "rose";
    } else {
      colorKey = "indigo";
    }
  }

  // Get color classes
  const colorParams = COLOR_MAP[colorKey] || COLOR_MAP['slate'];
  const baseClasses = `inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border duration-300`;
  const colorClasses = `${colorParams.bg} ${colorParams.text} ${colorParams.border}`;

  // Get icon component dynamically. Must explicitly cast as any or React.ElementType to prevent generic TS issues.
  const IconComponent = (LucideIcons as any)[iconName] || LucideIcons.Tag;

  return (
    <span className={`${baseClasses} ${colorClasses} hover:bg-opacity-30`}>
      <IconComponent className="w-3.5 h-3.5" />
      {name}
    </span>
  );
}
