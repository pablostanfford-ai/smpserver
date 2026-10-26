'use client';

import { Clock, Keyboard } from 'lucide-react';
import type { RaceAbility } from '@/lib/types';

export function AbilityList({
  abilities,
  color,
  kind,
}: {
  abilities: RaceAbility[];
  color: string;
  kind: 'passive' | 'active';
}) {
  if (abilities.length === 0) {
    return <p className="text-sm text-ink-dim">У этой расы нет {kind === 'passive' ? 'пассивных' : 'активных'} способностей.</p>;
  }

  return (
    <ul className="space-y-3">
      {abilities.map((ability) => (
        <li
          key={ability.name}
          className="rounded-xl border border-white/[0.07] bg-void-900/50 p-4 transition-colors hover:border-white/[0.14]"
        >
          <div className="flex items-start justify-between gap-3">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-ink">
              <span
                className="h-1.5 w-1.5 shrink-0 rounded-full"
                style={{ background: color, boxShadow: `0 0 8px ${color}` }}
              />
              {ability.name}
            </h3>
            <div className="flex shrink-0 items-center gap-2">
              {ability.key && (
                <span className="badge border-white/10 bg-white/5 font-mono text-[10px] text-ink-muted">
                  <Keyboard className="h-3 w-3" />
                  {ability.key}
                </span>
              )}
              {ability.cooldown && (
                <span className="badge border-white/10 bg-white/5 font-mono text-[10px] text-ink-muted">
                  <Clock className="h-3 w-3" />
                  {ability.cooldown}
                </span>
              )}
            </div>
          </div>
          <p className="mt-2 pl-3.5 text-sm leading-relaxed text-ink-muted">{ability.description}</p>
        </li>
      ))}
    </ul>
  );
}
