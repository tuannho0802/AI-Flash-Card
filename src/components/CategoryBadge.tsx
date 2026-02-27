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
  const colorKey = category?.color || "slate";

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
