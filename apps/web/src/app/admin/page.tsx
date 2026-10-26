'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Users, Ban, VolumeX, Sparkles, ScrollText, ShieldAlert, Activity, Loader2, Radio } from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

interface Stats {
  users: number;
  banned: number;
  muted: number;
  races: number;
  logs24h: number;
  security24h: number;
  activeSessions: number;
}

interface RconStatus {
  enabled: boolean;
  ok: boolean;
  message?: string;
  error?: string;
  response?: string;
}

export default function AdminOverviewPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [rcon, setRcon] = useState<RconStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [statsRes, rconRes] = await Promise.allSettled([
        api.get<Stats>('/admin/logs/stats'),
        api.get<RconStatus>('/status/rcon'),
      ]);
      if (statsRes.status === 'fulfilled') setStats(statsRes.value);
      if (rconRes.status === 'fulfilled') setRcon(rconRes.value);
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-neon-cyan" />
      </div>
    );
  }

  const cards = [
    { label: 'Всего игроков', value: stats?.users ?? 0, Icon: Users, color: 'text-neon-cyan', href: '/admin/users' },
    { label: 'Активных сессий', value: stats?.activeSessions ?? 0, Icon: Activity, color: 'text-emerald-400', href: '/admin/users' },
    { label: 'Забанено', value: stats?.banned ?? 0, Icon: Ban, color: 'text-rose-400', href: '/admin/users' },
    { label: 'В муте', value: stats?.muted ?? 0, Icon: VolumeX, color: 'text-amber-400', href: '/admin/users' },
    { label: 'Рас в системе', value: stats?.races ?? 0, Icon: Sparkles, color: 'text-neon-violet', href: '/admin/races' },
    { label: 'Событий за 24ч', value: stats?.logs24h ?? 0, Icon: ScrollText, color: 'text-ink-muted', href: '/admin/logs' },
  ];

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="font-display text-3xl font-bold text-ink">Обзор</h1>
        <p className="mt-1 text-sm text-ink-muted">Состояние сайта и сервера в реальном времени</p>
      </header>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        {cards.map(({ label, value, Icon, color, href }) => (
          <Link key={label} href={href} className="glass glass-hover p-5">
            <div className={cn('flex items-center gap-2', color)}>
              <Icon className="h-4 w-4" />
              <span className="text-xs uppercase tracking-wider text-ink-dim">{label}</span>
            </div>
            <p className="mt-2 font-display text-3xl font-bold text-ink">{value}</p>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* RCON */}
        <section className="glass p-6">
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-ink">
            <Radio className="h-4 w-4 text-neon-cyan" />
            Мост к игровому серверу (RCON)
          </h2>

          <div className="mt-4 flex items-center gap-3">
            <span
              className={cn(
                'h-2.5 w-2.5 rounded-full',
                rcon?.ok ? 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)]' : 'bg-rose-500',
              )}
            />
            <p className="text-sm text-ink">
              {rcon?.enabled
                ? rcon.ok
                  ? 'Подключение активно'
                  : 'Нет подключения'
                : 'RCON отключён в конфигурации'}
            </p>
          </div>

          {(rcon?.error || rcon?.message) && (
            <p className="mt-3 rounded-lg border border-white/10 bg-void-900/60 p-3 font-mono text-xs text-ink-dim">
              {rcon.error ?? rcon.message}
            </p>
          )}
          {rcon?.response && (
            <p className="mt-3 rounded-lg border border-white/10 bg-void-900/60 p-3 font-mono text-xs text-emerald-300">
              {rcon.response}
            </p>
          )}

          <p className="mt-4 text-xs leading-relaxed text-ink-dim">
            Через RCON сайт выдаёт расы и ранги игрокам. Включите его в <code className="font-mono">.env</code>:
            {' '}<code className="font-mono text-neon-cyan">RCON_ENABLED=true</code>.
          </p>
        </section>

        {/* Безопасность */}
        <section className="glass p-6">
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-ink">
            <ShieldAlert className="h-4 w-4 text-rose-400" />
            Безопасность за 24 часа
          </h2>

          <div className="mt-4 flex items-baseline gap-3">
            <p className="font-display text-4xl font-bold text-ink">{stats?.security24h ?? 0}</p>
            <p className="text-sm text-ink-muted">событий уровня SECURITY</p>
          </div>

          <p className="mt-3 text-xs leading-relaxed text-ink-dim">
            Сюда попадают неудачные входы, смены ролей, баны и изменения критичных настроек.
          </p>

          <Link href="/admin/logs?level=SECURITY" className="btn-secondary mt-4 w-full">
            Открыть журнал безопасности
          </Link>
        </section>
      </div>
    </div>
  );
}
