'use client';

import Link from 'next/link';
import { ArrowUpRight, Users, Flame } from 'lucide-react';
import { RaceIcon } from '@/components/ui/RaceIcon';
import type { Race } from '@/lib/types';
import { cn } from '@/lib/utils';

export function RaceCard({ race, index = 0 }: { race: Race; index?: number }) {
  return (
    <Link
      href={`/races/${race.slug}`}
      className="glass glass-hover group relative overflow-hidden p-6 animate-fade-up"
      style={{
        animationDelay: `${index * 70}ms`,
        ['--race-primary' as string]: race.color,
        ['--race-accent' as string]: race.accentColor,
      }}
    >
      {/* Неоновое свечение при ховере */}
      <div
        className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-40"
        style={{ background: race.color }}
      />

      <div className="relative flex items-start justify-between">
        <div
          className="grid h-12 w-12 place-items-center rounded-xl border transition-transform duration-300 group-hover:scale-110"
          style={{
            borderColor: `${race.color}40`,
            background: `linear-gradient(135deg, ${race.color}22, ${race.accentColor}11)`,
            color: race.color,
          }}
        >
          <RaceIcon name={race.icon} className="h-6 w-6" />
        </div>

        <div className="flex items-center gap-2">
          {typeof race.playerCount === 'number' && (
            <span className="badge border-white/10 bg-white/5 text-ink-muted">
              <Users className="h-3 w-3" />
              {race.playerCount}
            </span>
          )}
          <ArrowUpRight className="h-4 w-4 text-ink-dim transition-all duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-ink" />
        </div>
      </div>

      <h3 className="relative mt-4 font-display text-xl font-bold text-ink transition-colors" style={{ color: undefined }}>
        <span className="transition-colors group-hover:text-[var(--race-primary)]">{race.name}</span>
      </h3>
      <p className="relative mt-1 text-sm text-ink-muted">{race.tagline}</p>

      <p className="relative mt-3 line-clamp-2 text-sm leading-relaxed text-ink-dim">
        {race.description}
      </p>

      <div className="relative mt-5 flex items-center justify-between">
        <div className="flex items-center gap-1" title={`Сложность: ${race.difficulty}/5`}>
          <Flame className="h-3.5 w-3.5 text-ink-dim" />
          {Array.from({ length: 5 }).map((_, i) => (
            <span
              key={i}
              className={cn('h-1.5 w-3 rounded-full transition-colors')}
              style={{ background: i < race.difficulty ? race.color : 'rgba(255,255,255,0.08)' }}
            />
          ))}
        </div>
        <span className="text-xs font-medium text-ink-dim">{race.playstyle}</span>
      </div>
    </Link>
  );
}
