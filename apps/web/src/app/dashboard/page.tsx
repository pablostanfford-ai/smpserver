'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Wallet,
  Swords,
  Clock,
  Skull,
  Bell,
  Activity,
  ShieldAlert,
  Sparkles,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/components/ui/Toast';
import { RaceIcon } from '@/components/ui/RaceIcon';
import { PlayerSkin } from '@/components/ui/PlayerSkin';
import { RaceChangeDialog } from '@/components/dashboard/RaceChangeDialog';
import { cn, formatNumber, formatRelative, formatPlaytime, ROLE_LABEL, STATUS_LABEL } from '@/lib/utils';
import type { DashboardResponse, Race } from '@/lib/types';

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [data, setData] = useState<DashboardResponse | null>(null);
  const [races, setRaces] = useState<Race[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const [dash, raceList] = await Promise.all([
        api.get<DashboardResponse>('/me/dashboard'),
        api.get<{ races: Race[] }>('/races'),
      ]);
      setData(dash);
      setRaces(raceList.races.filter((r) => r.isSelectable));
      setError(null);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        router.push('/login?next=/dashboard');
        return;
      }
      setError(err instanceof ApiError ? err.message : 'Не удалось загрузить кабинет');
    }
  }, [router]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/login?next=/dashboard');
      return;
    }
    void load();
  }, [authLoading, user, load, router]);

  const markAllRead = async () => {
    try {
      await api.post('/me/notifications/read', {});
      await load();
      toast('Уведомления прочитаны', 'success');
    } catch {
      toast('Не удалось отметить уведомления', 'error');
    }
  };

  if (authLoading || (!data && !error)) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-neon-cyan" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass mx-auto max-w-md p-8 text-center">
        <ShieldAlert className="mx-auto h-8 w-8 text-rose-400" />
        <p className="mt-3 text-sm text-ink-muted">{error}</p>
        <button type="button" onClick={() => void load()} className="btn-secondary mt-4">
          <RefreshCw className="h-4 w-4" />
          Повторить
        </button>
      </div>
    );
  }

  if (!data) return null;

  const { user: u, activity, notifications, unreadCount, raceChange } = data;
  const raceColor = u.race?.color ?? '#22d3ee';

  return (
    <div className="flex flex-col gap-6" style={{ ['--race-primary' as string]: raceColor }}>
      {/* ── Предупреждения о модерации ── */}
      {u.status === 'MUTED' && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-medium">Вы получили мут</p>
            <p className="mt-0.5 text-amber-200/80">
              {u.muteReason}
              {u.mutedUntil && ` · до ${formatRelative(u.mutedUntil)}`}
            </p>
          </div>
        </div>
      )}

      {/* ── Профиль ── */}
      <section className="glass relative overflow-hidden p-6 sm:p-8">
        <div
          className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full opacity-25 blur-[90px]"
          style={{ background: raceColor }}
        />
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center">
          <PlayerSkin
            src={u.skins.body}
            fallbackSrc={u.skins.bodyFallback}
            alt={`Скин ${u.mcName}`}
            size={112}
            variant="body"
          />

          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="font-display text-3xl font-bold text-ink">{u.mcName}</h1>
              <span className="badge border-neon-cyan/30 bg-neon-cyan/10 text-neon-cyan">
                {ROLE_LABEL[u.role]}
              </span>
              <span
                className={cn(
                  'badge',
                  u.status === 'ACTIVE' && 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
                  u.status === 'MUTED' && 'border-amber-500/30 bg-amber-500/10 text-amber-300',
                  u.status === 'BANNED' && 'border-rose-500/30 bg-rose-500/10 text-rose-300',
                )}
              >
                {STATUS_LABEL[u.status]}
              </span>
            </div>
            <p className="mt-1 text-sm text-ink-muted">
              Логин: {u.username} · Ранг: {u.rank}
            </p>
            {u.uuidFormatted && (
              <p className="mt-1 font-mono text-xs text-ink-dim">UUID: {u.uuidFormatted}</p>
            )}
            <p className="mt-2 text-xs text-ink-dim">Последний вход: {formatRelative(u.lastLoginAt)}</p>
          </div>

          <div className="flex flex-col items-start gap-2 sm:items-end">
            <p className="text-xs uppercase tracking-wider text-ink-dim">Текущая раса</p>
            {u.race ? (
              <Link
                href={`/races/${u.race.slug}`}
                className="flex items-center gap-2.5 rounded-xl border px-4 py-2.5 transition-colors hover:bg-white/[0.04]"
                style={{ borderColor: `${u.race.color}44` }}
              >
                <RaceIcon name={u.race.icon} className="h-5 w-5" style={{ color: u.race.color }} />
                <span className="font-semibold text-ink">{u.race.name}</span>
              </Link>
            ) : (
              <span className="badge border-white/10 bg-white/5 text-ink-muted">Не выбрана</span>
            )}
            <button
              type="button"
              onClick={() => setDialogOpen(true)}
              disabled={!raceChange.canChange}
              className="btn-secondary mt-1 !px-3.5 !py-1.5 text-xs"
              title={
                raceChange.canChange
                  ? 'Сменить расу'
                  : `Доступно ${formatRelative(raceChange.nextAt)}`
              }
            >
              <Sparkles className="h-3.5 w-3.5" />
              {raceChange.canChange ? 'Сменить расу' : `Через ${formatRelative(raceChange.nextAt)}`}
            </button>
          </div>
        </div>
      </section>

      {/* ── Статистика ── */}
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { icon: Wallet, label: 'Баланс', value: formatNumber(u.balance), suffix: 'монет' },
          { icon: Swords, label: 'Убийств', value: formatNumber(u.kills), suffix: `K/D ${u.kdRatio}` },
          { icon: Skull, label: 'Смертей', value: formatNumber(u.deaths), suffix: '' },
          { icon: Clock, label: 'В игре', value: formatPlaytime(u.playtimeMin), suffix: '' },
        ].map(({ icon: Icon, label, value, suffix }) => (
          <div key={label} className="glass p-5">
            <div className="flex items-center gap-2 text-ink-dim">
              <Icon className="h-4 w-4" />
              <span className="text-xs uppercase tracking-wider">{label}</span>
            </div>
            <p className="mt-2 font-display text-2xl font-bold text-ink">{value}</p>
            {suffix && <p className="mt-0.5 text-xs text-ink-dim">{suffix}</p>}
          </div>
        ))}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* ── Уведомления ── */}
        <section className="glass p-6">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-ink">
              <Bell className="h-4 w-4 text-neon-cyan" />
              Уведомления
              {unreadCount > 0 && (
                <span className="badge border-neon-cyan/30 bg-neon-cyan/10 text-neon-cyan">{unreadCount}</span>
              )}
            </h2>
            {unreadCount > 0 && (
              <button type="button" onClick={markAllRead} className="text-xs text-ink-dim transition-colors hover:text-ink">
                Прочитать все
              </button>
            )}
          </div>

          <ul className="mt-4 space-y-2">
            {notifications.length === 0 && <li className="text-sm text-ink-dim">Уведомлений пока нет</li>}
            {notifications.map((n) => (
              <li
                key={n.id}
                className={cn(
                  'rounded-xl border p-3.5 transition-colors',
                  n.readAt ? 'border-white/[0.06] bg-transparent' : 'border-white/[0.1] bg-white/[0.03]',
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className={cn('text-sm', n.readAt ? 'text-ink-muted' : 'font-medium text-ink')}>{n.title}</p>
                  {!n.readAt && <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-neon-cyan" />}
                </div>
                {n.body && <p className="mt-1 text-xs leading-relaxed text-ink-dim">{n.body}</p>}
                <p className="mt-1.5 text-[11px] text-ink-dim">{formatRelative(n.createdAt)}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* ── Активность ── */}
        <section className="glass p-6">
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-ink">
            <Activity className="h-4 w-4 text-neon-violet" />
            История активности
          </h2>

          <ol className="mt-4 space-y-0">
            {activity.length === 0 && <li className="text-sm text-ink-dim">Пока пусто</li>}
            {activity.map((event, i) => (
              <li key={event.id} className="relative flex gap-3 pb-4 last:pb-0">
                {i < activity.length - 1 && (
                  <span className="absolute left-[5px] top-3 h-full w-px bg-white/[0.08]" />
                )}
                <span className="relative mt-1.5 h-[11px] w-[11px] shrink-0 rounded-full border-2 border-void-800 bg-neon-cyan/70" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-ink-muted">{event.message}</p>
                  <p className="text-[11px] text-ink-dim">{formatRelative(event.createdAt)}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      </div>

      <RaceChangeDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        races={races}
        currentSlug={u.race?.slug ?? null}
        cooldownDays={raceChange.cooldownDays}
        onSuccess={() => {
          setDialogOpen(false);
          void load();
        }}
      />
    </div>
  );
}
