'use client';

import {
  User,
  Leaf,
  Mountain,
  Swords,
  Skull,
  Sparkles,
  Flame,
  Droplets,
  Wind,
  Shield,
  Zap,
  Moon,
  Sun,
  Ghost,
  type LucideIcon,
} from 'lucide-react';

/**
 * Белый список иконок: CMS хранит имя иконки строкой,
 * поэтому динамический импорт ограничен известным набором (безопасно и предсказуемо).
 */
export const ICON_MAP: Record<string, LucideIcon> = {
  User,
  Leaf,
  Mountain,
  Swords,
  Skull,
  Sparkles,
  Flame,
  Droplets,
  Wind,
  Shield,
  Zap,
  Moon,
  Sun,
  Ghost,
};

export const ICON_NAMES = Object.keys(ICON_MAP);

export function RaceIcon({
  name,
  className,
  style,
}: {
  name: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  const Icon = ICON_MAP[name] ?? Sparkles;
  return <Icon className={className} style={style} aria-hidden />;
}
