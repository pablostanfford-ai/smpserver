import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

export const formatNumber = (n: number) =>
  new Intl.NumberFormat('ru-RU').format(Math.round(n));

export const formatDate = (iso: string | Date | null) => {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
};

export const formatRelative = (iso: string | Date | null) => {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  const abs = Math.abs(diff);
  const rtf = new Intl.RelativeTimeFormat('ru', { numeric: 'auto' });

  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ['year', 31_536_000_000],
    ['month', 2_592_000_000],
    ['day', 86_400_000],
    ['hour', 3_600_000],
    ['minute', 60_000],
  ];

  for (const [unit, ms] of units) {
    if (abs >= ms) return rtf.format(Math.round(-diff / ms), unit);
  }
  return 'только что';
};

export const formatPlaytime = (minutes: number) => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h} ч ${m} мин` : `${m} мин`;
};

/** Копирование в буфер обмена с фолбэком для старых браузеров. */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export const ROLE_LABEL: Record<string, string> = {
  OWNER: 'Владелец',
  ADMIN: 'Администратор',
  MODERATOR: 'Модератор',
  PLAYER: 'Игрок',
};

export const STATUS_LABEL: Record<string, string> = {
  ACTIVE: 'Активен',
  MUTED: 'Мут',
  BANNED: 'Забанен',
};
