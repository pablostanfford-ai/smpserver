'use client';

import { useMemo, useState } from 'react';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { RaceCard } from './RaceCard';
import type { Race } from '@/lib/types';
import { cn } from '@/lib/utils';

type SortKey = 'default' | 'difficulty-asc' | 'difficulty-desc' | 'popular';

const SORTS: Array<{ key: SortKey; label: string }> = [
  { key: 'default', label: 'По порядку' },
  { key: 'popular', label: 'Популярные' },
  { key: 'difficulty-asc', label: 'Проще' },
  { key: 'difficulty-desc', label: 'Сложнее' },
];

export function RacesExplorer({ races }: { races: Race[] }) {
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortKey>('default');
  const [playstyle, setPlaystyle] = useState<string | null>(null);

  const playstyles = useMemo(
    () => Array.from(new Set(races.map((r) => r.playstyle).filter(Boolean))),
    [races],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    const result = races.filter((race) => {
      const matchesQuery =
        !q ||
        race.name.toLowerCase().includes(q) ||
        race.tagline.toLowerCase().includes(q) ||
        race.description.toLowerCase().includes(q) ||
        race.strengths.some((s) => s.toLowerCase().includes(q));
      const matchesStyle = !playstyle || race.playstyle === playstyle;
      return matchesQuery && matchesStyle;
    });

    switch (sort) {
      case 'popular':
        return [...result].sort((a, b) => (b.playerCount ?? 0) - (a.playerCount ?? 0));
      case 'difficulty-asc':
        return [...result].sort((a, b) => a.difficulty - b.difficulty);
      case 'difficulty-desc':
        return [...result].sort((a, b) => b.difficulty - a.difficulty);
      default:
        return result;
    }
  }, [races, query, sort, playstyle]);

  const hasFilters = query || playstyle || sort !== 'default';

  return (
    <div className="flex flex-col gap-6">
      <div className="glass flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-dim" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Поиск по названию или способности…"
            className="input pl-10"
            aria-label="Поиск рас"
          />
        </div>

        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 shrink-0 text-ink-dim" />
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="input w-full cursor-pointer sm:w-44"
            aria-label="Сортировка"
          >
            {SORTS.map((s) => (
              <option key={s.key} value={s.key} className="bg-void-800">
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {playstyles.length > 1 && (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setPlaystyle(null)}
            className={cn(
              'rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors',
              !playstyle
                ? 'border-neon-cyan/40 bg-neon-cyan/10 text-neon-cyan'
                : 'border-white/10 text-ink-muted hover:border-white/20 hover:text-ink',
            )}
          >
            Все стили
          </button>
          {playstyles.map((style) => (
            <button
              key={style}
              type="button"
              onClick={() => setPlaystyle(playstyle === style ? null : style)}
              className={cn(
                'rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors',
                playstyle === style
                  ? 'border-neon-cyan/40 bg-neon-cyan/10 text-neon-cyan'
                  : 'border-white/10 text-ink-muted hover:border-white/20 hover:text-ink',
              )}
            >
              {style}
            </button>
          ))}
          {hasFilters && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setSort('default');
                setPlaystyle(null);
              }}
              className="ml-auto inline-flex items-center gap-1 text-xs text-ink-dim transition-colors hover:text-rose-300"
            >
              <X className="h-3.5 w-3.5" />
              Сбросить
            </button>
          )}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="glass p-12 text-center">
          <p className="font-display text-lg font-semibold text-ink">Ничего не найдено</p>
          <p className="mt-2 text-sm text-ink-muted">Попробуйте изменить запрос или сбросить фильтры.</p>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((race, i) => (
            <RaceCard key={race.id} race={race} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}
