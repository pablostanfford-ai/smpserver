import type { Metadata } from 'next';
import { RacesExplorer } from '@/components/races/RacesExplorer';
import type { Race } from '@/lib/types';

export const metadata: Metadata = {
  title: 'Расы сервера',
  description: 'Пять рас AetherSMP: способности, сильные и слабые стороны, стиль игры.',
};

// Каталог управляется через CMS — рендерим на каждый запрос, а не на этапе сборки.
export const dynamic = 'force-dynamic';

async function getRaces(): Promise<Race[]> {
  const base = process.env.API_INTERNAL_URL ?? 'http://localhost:4000';
  try {
    const res = await fetch(`${base}/api/races`, { next: { revalidate: 30 } });
    if (!res.ok) return [];
    return ((await res.json()) as { races: Race[] }).races;
  } catch {
    return [];
  }
}

export default async function RacesPage() {
  const races = await getRaces();

  return (
    <div className="flex flex-col gap-10">
      <header className="max-w-2xl">
        <p className="text-xs font-semibold uppercase tracking-widest text-neon-cyan">Бестиарий</p>
        <h1 className="mt-2 font-display text-4xl font-bold tracking-tight text-ink sm:text-5xl">
          Расы AetherSMP
        </h1>
        <p className="mt-4 text-base leading-relaxed text-ink-muted">
          Раса определяет твои способности, скорость, здоровье и стиль боя. Выбор можно изменить позже,
          но не чаще раза в неделю — так что выбирай осознанно.
        </p>
      </header>

      <RacesExplorer races={races} />
    </div>
  );
}
