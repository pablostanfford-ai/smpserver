'use client';

import { useEffect, useState } from 'react';
import { X, Loader2, Check } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import { RaceIcon } from '@/components/ui/RaceIcon';
import { cn } from '@/lib/utils';
import type { Race } from '@/lib/types';

export function RaceChangeDialog({
  open,
  onClose,
  races,
  currentSlug,
  cooldownDays,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  races: Race[];
  currentSlug: string | null;
  cooldownDays: number;
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const [selected, setSelected] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (open) setSelected(null);
  }, [open]);

  // Закрытие по Escape и блокировка скролла под модалкой
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  const confirm = async () => {
    if (!selected) return;
    setPending(true);
    try {
      const res = await api.post<{ syncedToServer: boolean }>('/me/race', { raceSlug: selected });
      toast(
        res.syncedToServer
          ? 'Раса изменена и применена на сервере'
          : 'Раса изменена. На сервере применится при следующем входе',
        'success',
      );
      onSuccess();
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Не удалось сменить расу', 'error');
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-void-950/80 p-4 backdrop-blur-sm sm:items-center">
      <button type="button" className="absolute inset-0 cursor-default" onClick={onClose} aria-label="Закрыть" />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="race-dialog-title"
        className="glass relative w-full max-w-lg animate-fade-up p-6"
      >
        <div className="flex items-start justify-between">
          <div>
            <h2 id="race-dialog-title" className="font-display text-xl font-bold text-ink">
              Смена расы
            </h2>
            <p className="mt-1 text-sm text-ink-muted">
              Следующая смена будет доступна через {cooldownDays} дней.
            </p>
          </div>
          <button type="button" onClick={onClose} className="btn-ghost !p-2" aria-label="Закрыть">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 grid max-h-[45vh] gap-2 overflow-y-auto pr-1">
          {races.map((race) => {
            const isCurrent = race.slug === currentSlug;
            const isSelected = selected === race.slug;
            return (
              <button
                key={race.id}
                type="button"
                disabled={isCurrent}
                onClick={() => setSelected(race.slug)}
                className={cn(
                  'flex items-center gap-3 rounded-xl border p-3 text-left transition-all',
                  isCurrent && 'cursor-not-allowed opacity-40',
                  isSelected ? 'border-transparent bg-white/[0.07]' : 'border-white/10 hover:border-white/20',
                )}
                style={isSelected ? { boxShadow: `0 0 0 1px ${race.color}` } : undefined}
              >
                <span
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-lg"
                  style={{ background: `${race.color}1a`, color: race.color }}
                >
                  <RaceIcon name={race.icon} className="h-4.5 w-4.5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-ink">
                    {race.name}
                    {isCurrent && <span className="ml-2 text-xs text-ink-dim">(текущая)</span>}
                  </span>
                  <span className="block truncate text-xs text-ink-dim">{race.tagline}</span>
                </span>
                {isSelected && <Check className="h-4 w-4 shrink-0 text-emerald-400" />}
              </button>
            );
          })}
        </div>

        <div className="mt-5 flex gap-3">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">
            Отмена
          </button>
          <button
            type="button"
            onClick={confirm}
            disabled={!selected || pending}
            className="btn-primary flex-1"
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Подтвердить
          </button>
        </div>
      </div>
    </div>
  );
}
