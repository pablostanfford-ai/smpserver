import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Users, Flame, Check, X as XIcon, BookOpen } from 'lucide-react';
import { RaceIcon } from '@/components/ui/RaceIcon';
import { StatRadar } from '@/components/races/StatRadar';
import { AbilityList } from '@/components/races/AbilityList';
import { ChooseRaceButton } from '@/components/races/ChooseRaceButton';
import type { Race } from '@/lib/types';

// Контент расы редактируется через CMS — рендерим на каждый запрос.
export const dynamic = 'force-dynamic';

const API = process.env.API_INTERNAL_URL ?? 'http://localhost:4000';

async function getRace(slug: string): Promise<Race | null> {
  try {
    const res = await fetch(`${API}/api/races/${encodeURIComponent(slug)}`, { next: { revalidate: 30 } });
    if (!res.ok) return null;
    return ((await res.json()) as { race: Race }).race;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const race = await getRace(params.slug);
  if (!race) return { title: 'Раса не найдена' };
  return {
    title: `${race.name} — раса`,
    description: race.description.slice(0, 160),
  };
}

export default async function RaceDetailPage({ params }: { params: { slug: string } }) {
  const race = await getRace(params.slug);
  if (!race) notFound();

  return (
    <div
      className="flex flex-col gap-8"
      style={{
        ['--race-primary' as string]: race.color,
        ['--race-accent' as string]: race.accentColor,
      }}
    >
      <Link href="/races" className="inline-flex w-fit items-center gap-2 text-sm text-ink-muted transition-colors hover:text-ink">
        <ArrowLeft className="h-4 w-4" />
        Все расы
      </Link>

      {/* ── Баннер ── */}
      <section className="glass relative overflow-hidden p-8 sm:p-10">
        <div
          className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full opacity-30 blur-[100px]"
          style={{ background: race.color }}
        />
        <div
          className="pointer-events-none absolute -bottom-32 -left-16 h-64 w-64 rounded-full opacity-20 blur-[100px]"
          style={{ background: race.accentColor }}
        />

        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-start">
          <div
            className="grid h-20 w-20 shrink-0 place-items-center rounded-2xl border"
            style={{
              borderColor: `${race.color}55`,
              background: `linear-gradient(135deg, ${race.color}2a, ${race.accentColor}15)`,
              color: race.color,
              boxShadow: `0 0 40px -10px ${race.color}88`,
            }}
          >
            <RaceIcon name={race.icon} className="h-10 w-10" />
          </div>

          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="font-display text-4xl font-bold tracking-tight text-ink sm:text-5xl">
                {race.name}
              </h1>
              {typeof race.playerCount === 'number' && (
                <span className="badge border-white/10 bg-white/5 text-ink-muted">
                  <Users className="h-3 w-3" />
                  {race.playerCount} игроков
                </span>
              )}
            </div>
            <p className="mt-2 text-lg text-ink-muted">{race.tagline}</p>

            <div className="mt-5 flex flex-wrap items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-ink-dim">Сложность</span>
                <div className="flex items-center gap-1">
                  <Flame className="h-3.5 w-3.5" style={{ color: race.color }} />
                  {Array.from({ length: 5 }).map((_, i) => (
                    <span
                      key={i}
                      className="h-1.5 w-4 rounded-full"
                      style={{ background: i < race.difficulty ? race.color : 'rgba(255,255,255,0.08)' }}
                    />
                  ))}
                </div>
              </div>
              <span className="text-ink-dim">
                Стиль: <span className="text-ink">{race.playstyle || '—'}</span>
              </span>
            </div>
          </div>

          <ChooseRaceButton race={race} />
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* ── Левая колонка: лор и способности ── */}
        <div className="flex flex-col gap-6 lg:col-span-2">
          <section className="glass p-6">
            <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-ink">
              <BookOpen className="h-4 w-4" style={{ color: race.color }} />
              Описание
            </h2>
            <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-ink-muted">
              {race.description}
            </p>
            {race.lore && (
              <>
                <div className="my-5 divider" />
                <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-dim">Лор</h3>
                <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-ink-dim italic">
                  {race.lore}
                </p>
              </>
            )}
          </section>

          <section className="glass p-6">
            <h2 className="font-display text-lg font-semibold text-ink">Пассивные способности</h2>
            <p className="mt-1 text-xs text-ink-dim">Работают постоянно, без активации</p>
            <div className="mt-4">
              <AbilityList abilities={race.passives} color={race.color} kind="passive" />
            </div>
          </section>

          <section className="glass p-6">
            <h2 className="font-display text-lg font-semibold text-ink">Активные способности</h2>
            <p className="mt-1 text-xs text-ink-dim">Требуют активации и имеют перезарядку</p>
            <div className="mt-4">
              <AbilityList abilities={race.actives} color={race.accentColor} kind="active" />
            </div>
          </section>
        </div>

        {/* ── Правая колонка: статы, плюсы, минусы ── */}
        <div className="flex flex-col gap-6">
          <section className="glass p-6">
            <h2 className="font-display text-lg font-semibold text-ink">Характеристики</h2>
            <p className="mt-1 text-xs text-ink-dim">Отклонение от базовых значений</p>
            <div className="mt-5">
              <StatRadar stats={race.stats} color={race.color} accent={race.accentColor} />
            </div>
          </section>

          <section className="glass p-6">
            <h2 className="font-display text-lg font-semibold text-ink">Сильные стороны</h2>
            <ul className="mt-4 space-y-2.5">
              {race.strengths.map((s) => (
                <li key={s} className="flex items-start gap-2.5 text-sm text-ink-muted">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                  {s}
                </li>
              ))}
            </ul>
          </section>

          <section className="glass p-6">
            <h2 className="font-display text-lg font-semibold text-ink">Слабые стороны</h2>
            <ul className="mt-4 space-y-2.5">
              {race.weaknesses.map((w) => (
                <li key={w} className="flex items-start gap-2.5 text-sm text-ink-muted">
                  <XIcon className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
                  {w}
                </li>
              ))}
            </ul>
          </section>

          {race.recommended && (
            <section className="glass border-l-2 p-6" style={{ borderLeftColor: race.color }}>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-dim">Кому подойдёт</h2>
              <p className="mt-2 text-sm leading-relaxed text-ink-muted">{race.recommended}</p>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
