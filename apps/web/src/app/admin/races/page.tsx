'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Pencil, Trash2, Eye, EyeOff, Loader2, Users, RefreshCw, Lock } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { useAuth, hasRole } from '@/lib/auth-context';
import { useToast } from '@/components/ui/Toast';
import { RaceIcon } from '@/components/ui/RaceIcon';
import { RaceEditorDialog } from '@/components/admin/RaceEditorDialog';
import { cn } from '@/lib/utils';
import type { Race } from '@/lib/types';

type RaceRow = Race & { playerCount: number };

export default function AdminRacesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const isOwner = hasRole(user, 'OWNER');

  const [races, setRaces] = useState<RaceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Race | 'new' | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<{ races: RaceRow[] }>('/admin/races');
      setRaces(data.races);
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Не удалось загрузить расы', 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const toggleActive = async (race: RaceRow) => {
    setBusyId(race.id);
    try {
      await api.patch(`/admin/races/${race.id}`, { isActive: !race.isActive });
      await load();
      toast(race.isActive ? `«${race.name}» скрыта с сайта` : `«${race.name}» опубликована`, 'success');
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Ошибка сохранения', 'error');
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (race: RaceRow) => {
    const message =
      race.playerCount > 0
        ? `За расой «${race.name}» закреплено ${race.playerCount} игроков.\nОна будет деактивирована, а не удалена. Продолжить?`
        : `Удалить расу «${race.name}» безвозвратно?`;

    if (!window.confirm(message)) return;

    setBusyId(race.id);
    try {
      const res = await api.delete<{ softDeleted: boolean; message?: string }>(`/admin/races/${race.id}`);
      await load();
      toast(res.softDeleted ? (res.message ?? 'Раса деактивирована') : 'Раса удалена', 'success');
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Не удалось удалить расу', 'error');
    } finally {
      setBusyId(null);
    }
  };

  const syncAll = async (race: RaceRow) => {
    setBusyId(race.id);
    try {
      const res = await api.post<{ ok: boolean; total: number; failed: unknown[] }>(
        `/admin/races/${race.id}/sync-all`,
      );
      toast(
        res.ok
          ? `Синхронизировано игроков: ${res.total}`
          : `Синхронизировано ${res.total - res.failed.length} из ${res.total}`,
        res.ok ? 'success' : 'error',
      );
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'RCON недоступен', 'error');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold text-ink">Расы</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Полный CMS-контроль: статы, способности, лор и видимость на сайте
          </p>
        </div>

        <button
          type="button"
          onClick={() => setEditing('new')}
          disabled={!isOwner}
          className="btn-primary"
          title={isOwner ? 'Создать расу' : 'Только для владельца'}
        >
          {isOwner ? <Plus className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
          Новая раса
        </button>
      </header>

      {!isOwner && (
        <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs text-amber-200">
          У вас режим просмотра: создание и изменение рас доступно только владельцу сервера.
        </p>
      )}

      {loading ? (
        <div className="glass flex min-h-[40vh] items-center justify-center">
          <Loader2 className="h-7 w-7 animate-spin text-neon-cyan" />
        </div>
      ) : races.length === 0 ? (
        <div className="glass p-12 text-center">
          <p className="font-display text-lg font-semibold text-ink">Рас пока нет</p>
          <p className="mt-2 text-sm text-ink-muted">
            Создайте первую расу или выполните <code className="font-mono text-neon-cyan">npm run db:seed</code>.
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {races.map((race) => (
            <div
              key={race.id}
              className={cn(
                'glass flex flex-col gap-4 p-5 transition-opacity sm:flex-row sm:items-center',
                !race.isActive && 'opacity-60',
              )}
            >
              <div
                className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border"
                style={{
                  borderColor: `${race.color}44`,
                  background: `linear-gradient(135deg, ${race.color}22, ${race.accentColor}11)`,
                  color: race.color,
                }}
              >
                <RaceIcon name={race.icon} className="h-6 w-6" />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-display text-lg font-semibold text-ink">{race.name}</h2>
                  <code className="rounded bg-white/5 px-1.5 py-0.5 font-mono text-[10px] text-ink-dim">
                    {race.slug}
                  </code>
                  {!race.isActive && (
                    <span className="badge border-white/10 bg-white/5 text-ink-dim">скрыта</span>
                  )}
                  {!race.isSelectable && race.isActive && (
                    <span className="badge border-amber-500/30 bg-amber-500/10 text-amber-300">только просмотр</span>
                  )}
                </div>
                <p className="mt-0.5 truncate text-sm text-ink-muted">{race.tagline}</p>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-ink-dim">
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {race.playerCount} игроков
                  </span>
                  <span>Сложность {race.difficulty}/5</span>
                  <span>{race.actives.length} активных · {race.passives.length} пассивных</span>
                </div>
              </div>

              <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                <Link href={`/races/${race.slug}`} className="btn-ghost !px-2.5 !py-1.5 text-xs" target="_blank">
                  <Eye className="h-3.5 w-3.5" />
                </Link>

                <button
                  type="button"
                  onClick={() => void syncAll(race)}
                  disabled={!isOwner || busyId === race.id}
                  className="btn-ghost !px-2.5 !py-1.5 text-xs"
                  title="Синхронизировать с сервером через RCON"
                >
                  <RefreshCw className={cn('h-3.5 w-3.5', busyId === race.id && 'animate-spin')} />
                </button>

                <button
                  type="button"
                  onClick={() => void toggleActive(race)}
                  disabled={!isOwner || busyId === race.id}
                  className="btn-ghost !px-2.5 !py-1.5 text-xs"
                  title={race.isActive ? 'Скрыть с сайта' : 'Опубликовать'}
                >
                  {race.isActive ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>

                <button
                  type="button"
                  onClick={() => setEditing(race)}
                  disabled={!isOwner}
                  className="btn-secondary !px-3 !py-1.5 text-xs"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Изменить
                </button>

                <button
                  type="button"
                  onClick={() => void remove(race)}
                  disabled={!isOwner || busyId === race.id}
                  className="btn-ghost !px-2.5 !py-1.5 text-xs hover:!bg-rose-500/10 hover:!text-rose-300"
                  title="Удалить"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <RaceEditorDialog
          race={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            void load();
          }}
        />
      )}
    </div>
  );
}
