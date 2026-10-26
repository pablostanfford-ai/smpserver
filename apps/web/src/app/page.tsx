import Link from 'next/link';
import { ArrowRight, Boxes, Users, Zap, Shield, Sparkles, Trophy } from 'lucide-react';
import { RaceCard } from '@/components/races/RaceCard';
import type { Race } from '@/lib/types';

/**
 * Страница зависит от CMS: расы добавляются и правятся в админке в любой момент.
 * Без force-dynamic Next пререндерит её на этапе сборки — когда API ещё не запущен,
 * и в статику «запекается» пустой список рас.
 */
export const dynamic = 'force-dynamic';

/** Данные берём на сервере: лендинг должен отдавать контент без JS. */
async function getRaces(): Promise<Race[]> {
  const base = process.env.API_INTERNAL_URL ?? 'http://localhost:4000';
  try {
    const res = await fetch(`${base}/api/races`, { next: { revalidate: 30 } });
    if (!res.ok) return [];
    const data = (await res.json()) as { races: Race[] };
    return data.races;
  } catch {
    return [];
  }
}

const FEATURES = [
  {
    icon: Boxes,
    title: 'Пять уникальных рас',
    text: 'Пассивные и активные способности, реальные баффы и дебаффы — каждая раса меняет геймплей, а не только внешность.',
  },
  {
    icon: Shield,
    title: 'Честное выживание',
    text: 'Никаких приватов за донат и pay-to-win. Только ты, твоя раса и твои решения.',
  },
  {
    icon: Users,
    title: 'Живое сообщество',
    text: 'Групповые события, клановые войны и экономика, где игроки торгуют между собой.',
  },
  {
    icon: Zap,
    title: 'Синхронизация с сервером',
    text: 'Выбранная на сайте раса применяется в игре автоматически — через RCON-мост.',
  },
];

export default async function HomePage() {
  const races = await getRaces();
  const featured = races.slice(0, 5);

  return (
    <div className="flex flex-col gap-28">
      {/* ── HERO ── */}
      <section className="relative flex min-h-[72vh] flex-col items-center justify-center text-center">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-radial-fade" />

        <div className="badge animate-fade-up border-emerald-500/30 bg-emerald-500/10 text-emerald-300">
          <span className="h-1.5 w-1.5 animate-pulse-glow rounded-full bg-emerald-400" />
          Сервер онлайн · Java 1.21.4
        </div>

        <h1
          className="mt-6 max-w-4xl text-balance font-display text-5xl font-bold leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl animate-fade-up"
          style={{ animationDelay: '80ms' }}
        >
          Твой путь начинается
          <br />
          <span className="text-gradient">с выбора расы</span>
        </h1>

        <p
          className="mt-6 max-w-2xl text-balance text-base leading-relaxed text-ink-muted sm:text-lg animate-fade-up"
          style={{ animationDelay: '160ms' }}
        >
          AetherSMP — ванильное выживание, где люди, эльфы, гномы, орки и нежить играют по разным правилам.
          Выбери сторону, прокачай способности и оставь свой след в истории сервера.
        </p>

        <div
          className="mt-10 flex flex-col items-center gap-3 sm:flex-row animate-fade-up"
          style={{ animationDelay: '240ms' }}
        >
          <Link href="/register" className="btn-primary w-full !px-7 !py-3 text-base sm:w-auto">
            Начать играть
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link href="/races" className="btn-secondary w-full !px-7 !py-3 text-base sm:w-auto">
            <Sparkles className="h-4 w-4" />
            Изучить расы
          </Link>
        </div>

        <div
          className="mt-14 grid w-full max-w-3xl grid-cols-3 gap-4 animate-fade-up"
          style={{ animationDelay: '320ms' }}
        >
          {[
            { value: races.length || 5, label: 'рас' },
            { value: '24/7', label: 'аптайм' },
            { value: '1.21.4', label: 'версия' },
          ].map((stat) => (
            <div key={stat.label} className="glass px-4 py-5">
              <p className="font-display text-2xl font-bold text-ink sm:text-3xl">{stat.value}</p>
              <p className="mt-1 text-xs uppercase tracking-wider text-ink-dim">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── РАСЫ ── */}
      <section id="races">
        <div className="mb-10 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-neon-cyan">Расы сервера</p>
            <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
              Пять путей — один мир
            </h2>
            <p className="mt-2 max-w-xl text-sm text-ink-muted">
              У каждой расы свои сильные и слабые стороны. Идеального выбора не существует — есть тот, что подходит тебе.
            </p>
          </div>
          <Link href="/races" className="btn-secondary shrink-0">
            Все расы
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {featured.length > 0 ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((race, i) => (
              <RaceCard key={race.id} race={race} index={i} />
            ))}
          </div>
        ) : (
          <div className="glass p-10 text-center">
            <p className="text-ink-muted">
              Расы ещё не загружены. Запустите API и выполните <code className="font-mono text-neon-cyan">npm run db:seed</code>.
            </p>
          </div>
        )}
      </section>

      {/* ── ФИЧИ ── */}
      <section>
        <div className="mb-10 text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-neon-violet">Почему мы</p>
          <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            Не просто ещё один SMP
          </h2>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          {FEATURES.map(({ icon: Icon, title, text }, i) => (
            <div
              key={title}
              className="glass glass-hover p-6 animate-fade-up"
              style={{ animationDelay: `${i * 70}ms` }}
            >
              <div className="grid h-11 w-11 place-items-center rounded-xl border border-white/10 bg-white/[0.03] text-neon-cyan">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-display text-lg font-semibold text-ink">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-muted">{text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-void-800/60 px-6 py-16 text-center backdrop-blur-xl">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-radial-fade opacity-80" />
        <Trophy className="mx-auto h-10 w-10 text-neon-amber" />
        <h2 className="mt-5 font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
          Готов выбрать свою расу?
        </h2>
        <p className="mx-auto mt-3 max-w-lg text-sm text-ink-muted">
          Регистрация занимает минуту. Проверь свой ник, выбери расу — и заходи на сервер.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link href="/register" className="btn-primary !px-7 !py-3 text-base">
            Создать аккаунт
          </Link>
          <Link href="/server" className="btn-ghost">
            Как подключиться
          </Link>
        </div>
      </section>
    </div>
  );
}
