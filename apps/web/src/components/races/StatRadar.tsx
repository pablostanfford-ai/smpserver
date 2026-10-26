'use client';

import { cn } from '@/lib/utils';

const STAT_LABELS: Record<string, string> = {
  health: 'Здоровье',
  speed: 'Скорость',
  damage: 'Урон',
  defense: 'Защита',
  mana: 'Мана',
  mining: 'Добыча',
  stealth: 'Скрытность',
};

const STAT_ORDER = ['health', 'speed', 'damage', 'defense', 'mana'];

/**
 * Радар характеристик на чистом SVG (без внешних библиотек).
 * Значение -100..100 отображается как отклонение от центра.
 */
export function StatRadar({
  stats,
  color,
  accent,
}: {
  stats: Record<string, number>;
  color: string;
  accent: string;
}) {
  const entries = STAT_ORDER.filter((k) => k in stats).map((k) => ({
    key: k,
    label: STAT_LABELS[k] ?? k,
    value: stats[k] ?? 0,
  }));

  if (entries.length < 3) {
    return (
      <div className="space-y-3">
        {Object.entries(stats).map(([key, value]) => (
          <StatBar key={key} label={STAT_LABELS[key] ?? key} value={value} color={color} />
        ))}
        {Object.keys(stats).length === 0 && <p className="text-sm text-ink-dim">Характеристики не заданы</p>}
      </div>
    );
  }

  const size = 260;
  const center = size / 2;
  const radius = 88;
  const max = 6; // визуальный максимум отклонения
  const angleStep = (Math.PI * 2) / entries.length;

  const pointFor = (index: number, ratio: number) => {
    const angle = index * angleStep - Math.PI / 2;
    return {
      x: center + Math.cos(angle) * radius * ratio,
      y: center + Math.sin(angle) * radius * ratio,
    };
  };

  // Значения -max..max → 0.15..1 (центр никогда не схлопывается в точку)
  const ratioFor = (value: number) => 0.15 + (Math.min(Math.max(value, -max), max) + max) / (max * 2) * 0.85;

  const polygon = entries
    .map((e, i) => {
      const p = pointFor(i, ratioFor(e.value));
      return `${p.x},${p.y}`;
    })
    .join(' ');

  return (
    <div className="flex flex-col items-center gap-5">
      <svg viewBox={`0 0 ${size} ${size}`} className="w-full max-w-[260px]" role="img" aria-label="Радар характеристик">
        <defs>
          <linearGradient id="radarFill" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.45" />
            <stop offset="100%" stopColor={accent} stopOpacity="0.2" />
          </linearGradient>
        </defs>

        {[0.25, 0.5, 0.75, 1].map((r) => (
          <polygon
            key={r}
            points={entries
              .map((_, i) => {
                const p = pointFor(i, r);
                return `${p.x},${p.y}`;
              })
              .join(' ')}
            fill="none"
            stroke="rgba(255,255,255,0.07)"
            strokeWidth="1"
          />
        ))}

        {entries.map((_, i) => {
          const p = pointFor(i, 1);
          return (
            <line
              key={i}
              x1={center}
              y1={center}
              x2={p.x}
              y2={p.y}
              stroke="rgba(255,255,255,0.07)"
              strokeWidth="1"
            />
          );
        })}

        <polygon points={polygon} fill="url(#radarFill)" stroke={color} strokeWidth="1.5" />

        {entries.map((e, i) => {
          const p = pointFor(i, ratioFor(e.value));
          return <circle key={e.key} cx={p.x} cy={p.y} r="3" fill={color} />;
        })}

        {entries.map((e, i) => {
          const p = pointFor(i, 1.22);
          return (
            <text
              key={`label-${e.key}`}
              x={p.x}
              y={p.y}
              textAnchor="middle"
              dominantBaseline="middle"
              className="fill-current text-[9px]"
              style={{ fill: 'rgba(154,163,184,0.9)' }}
            >
              {e.label}
            </text>
          );
        })}
      </svg>

      <div className="w-full space-y-2.5">
        {entries.map((e) => (
          <StatBar key={e.key} label={e.label} value={e.value} color={color} />
        ))}
      </div>
    </div>
  );
}

function StatBar({ label, value, color }: { label: string; value: number; color: string }) {
  const normalized = Math.min(Math.abs(value) / 6, 1) * 100;
  const positive = value >= 0;

  return (
    <div className="flex items-center gap-3 text-xs">
      <span className="w-20 shrink-0 text-ink-dim">{label}</span>
      <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-void-600">
        <div
          className={cn('absolute inset-y-0 rounded-full transition-all duration-700')}
          style={{
            width: `${Math.max(normalized, 4)}%`,
            left: positive ? 0 : 'auto',
            right: positive ? 'auto' : 0,
            background: positive ? color : '#fb7185',
          }}
        />
      </div>
      <span className={cn('w-9 shrink-0 text-right font-mono', positive ? 'text-ink-muted' : 'text-rose-300')}>
        {value > 0 ? `+${value}` : value}
      </span>
    </div>
  );
}
