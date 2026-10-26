'use client';

import { useEffect, useState } from 'react';
import { X, Loader2, Ban, VolumeX, Crown, Coins, Sparkles, ShieldCheck, Trash2 } from 'lucide-react';
import { PlayerSkin } from '@/components/ui/PlayerSkin';
import { api, ApiError } from '@/lib/api';
import { useAuth, hasRole } from '@/lib/auth-context';
import { useToast } from '@/components/ui/Toast';
import { cn, ROLE_LABEL, STATUS_LABEL, formatNumber } from '@/lib/utils';
import type { AdminUserRow, Race, Role } from '@/lib/types';

type Tab = 'role' | 'moderation' | 'race' | 'balance';

export function UserManageDialog({
  user,
  onClose,
  onUpdated,
}: {
  user: AdminUserRow;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const { user: me } = useAuth();
  const { toast } = useToast();

  const [tab, setTab] = useState<Tab>('moderation');
  const [pending, setPending] = useState(false);
  const [races, setRaces] = useState<Race[]>([]);

  const [role, setRole] = useState<Role>(user.role);
  const [banReason, setBanReason] = useState('');
  const [muteReason, setMuteReason] = useState('');
  const [until, setUntil] = useState('');
  const [alsoServer, setAlsoServer] = useState(true);
  const [raceSlug, setRaceSlug] = useState(user.race?.slug ?? '');
  const [amount, setAmount] = useState('100');
  const [balanceReason, setBalanceReason] = useState('');

  const isOwner = hasRole(me, 'OWNER');
  const canChangeRole = isOwner && user.id !== me?.id;

  useEffect(() => {
    if (tab !== 'race' || races.length > 0) return;
    api
      .get<{ races: Race[] }>('/admin/races')
      .then((d) => setRaces(d.races))
      .catch(() => setRaces([]));
  }, [tab, races.length]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const run = async (fn: () => Promise<unknown>, successMsg: string) => {
    setPending(true);
    try {
      await fn();
      toast(successMsg, 'success');
      onUpdated();
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Операция не выполнена', 'error');
    } finally {
      setPending(false);
    }
  };

  const TABS: Array<{ key: Tab; label: string; Icon: typeof Ban }> = [
    { key: 'moderation', label: 'Модерация', Icon: Ban },
    ...(isOwner ? [{ key: 'role' as Tab, label: 'Роль', Icon: Crown }] : []),
    { key: 'race', label: 'Раса', Icon: Sparkles },
    { key: 'balance', label: 'Баланс', Icon: Coins },
  ];

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-void-950/85 p-4 backdrop-blur-sm sm:items-center">
      <button type="button" className="absolute inset-0 cursor-default" onClick={onClose} aria-label="Закрыть" />

      <div role="dialog" aria-modal="true" className="glass relative w-full max-w-xl animate-fade-up">
        {/* Шапка */}
        <div className="flex items-start justify-between border-b border-white/[0.07] p-5">
          <div className="flex items-center gap-3">
            <PlayerSkin
              src={user.skins.head}
              fallbackSrc={user.skins.headFallback}
              alt={user.mcName}
              size={48}
              variant="head"
              className="!rounded-xl"
            />
            <div>
              <h2 className="font-display text-lg font-bold text-ink">{user.mcName}</h2>
              <p className="text-xs text-ink-dim">
                {user.email} · {ROLE_LABEL[user.role]} · {STATUS_LABEL[user.status]}
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="btn-ghost !p-2" aria-label="Закрыть">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Табы */}
        <div className="flex gap-1 border-b border-white/[0.07] px-3 pt-2">
          {TABS.map(({ key, label, Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={cn(
                'flex items-center gap-1.5 rounded-t-lg px-3 py-2 text-xs font-medium transition-colors',
                tab === key
                  ? 'border-b-2 border-neon-cyan text-neon-cyan'
                  : 'text-ink-dim hover:text-ink',
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>

        <div className="max-h-[55vh] overflow-y-auto p-5">
          {/* ── Модерация ── */}
          {tab === 'moderation' && (
            <div className="space-y-5">
              <div>
                <label className="label">Причина бана</label>
                <textarea
                  value={banReason}
                  onChange={(e) => setBanReason(e.target.value)}
                  rows={2}
                  className="input resize-none"
                  placeholder="Например: использование читов"
                />
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <input
                    type="datetime-local"
                    value={until}
                    onChange={(e) => setUntil(e.target.value)}
                    className="input w-auto text-xs"
                    aria-label="Бан до"
                  />
                  <label className="flex items-center gap-1.5 text-xs text-ink-muted">
                    <input
                      type="checkbox"
                      checked={alsoServer}
                      onChange={(e) => setAlsoServer(e.target.checked)}
                      className="h-3.5 w-3.5 rounded accent-neon-cyan"
                    />
                    также на игровом сервере (RCON)
                  </label>
                </div>
                <button
                  type="button"
                  disabled={pending || banReason.length < 3}
                  onClick={() =>
                    void run(
                      () =>
                        api.post(`/admin/users/${user.id}/ban`, {
                          reason: banReason,
                          until: until ? new Date(until).toISOString() : null,
                          alsoServer,
                        }),
                      `${user.mcName} забанен`,
                    )
                  }
                  className="btn-danger mt-3 w-full"
                >
                  {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4" />}
                  Забанить
                </button>
              </div>

              <div className="divider" />

              <div>
                <label className="label">Причина мута</label>
                <textarea
                  value={muteReason}
                  onChange={(e) => setMuteReason(e.target.value)}
                  rows={2}
                  className="input resize-none"
                  placeholder="Например: оскорбления в чате"
                />
                <button
                  type="button"
                  disabled={pending || muteReason.length < 3}
                  onClick={() =>
                    void run(
                      () => api.post(`/admin/users/${user.id}/mute`, { reason: muteReason, until: null }),
                      `${user.mcName} получил мут`,
                    )
                  }
                  className="btn-secondary mt-3 w-full"
                >
                  <VolumeX className="h-4 w-4" />
                  Замутить
                </button>
              </div>

              <div className="divider" />

              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={pending || user.status !== 'BANNED'}
                  onClick={() =>
                    void run(() => api.post(`/admin/users/${user.id}/unban`), `${user.mcName} разбанен`)
                  }
                  className="btn-secondary flex-1"
                >
                  <ShieldCheck className="h-4 w-4" />
                  Разбанить
                </button>
                <button
                  type="button"
                  disabled={pending || user.status !== 'MUTED'}
                  onClick={() => void run(() => api.post(`/admin/users/${user.id}/unmute`), 'Мут снят')}
                  className="btn-secondary flex-1"
                >
                  <VolumeX className="h-4 w-4" />
                  Снять мут
                </button>
              </div>

              {isOwner && user.id !== me?.id && (
                <>
                  <div className="divider" />
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => {
                      if (!confirm(`Удалить аккаунт ${user.mcName}? Действие необратимо.`)) return;
                      void run(() => api.delete(`/admin/users/${user.id}`), 'Аккаунт удалён');
                    }}
                    className="btn-ghost w-full !text-rose-300 hover:!bg-rose-500/10"
                  >
                    <Trash2 className="h-4 w-4" />
                    Удалить аккаунт
                  </button>
                </>
              )}
            </div>
          )}

          {/* ── Роль ── */}
          {tab === 'role' && (
            <div className="space-y-3">
              {!canChangeRole && (
                <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">
                  Нельзя изменить роль себе или пользователю с равными правами.
                </p>
              )}
              {(Object.keys(ROLE_LABEL) as Role[]).map((r) => (
                <label
                  key={r}
                  className={cn(
                    'flex cursor-pointer items-center justify-between rounded-xl border p-3.5 transition-colors',
                    role === r ? 'border-neon-cyan/40 bg-neon-cyan/5' : 'border-white/10 hover:border-white/20',
                    !canChangeRole && 'cursor-not-allowed opacity-60',
                  )}
                >
                  <div>
                    <p className="text-sm font-medium text-ink">{ROLE_LABEL[r]}</p>
                    <p className="text-xs text-ink-dim">
                      {r === 'OWNER' && 'Полный доступ, включая CMS и управление ролями'}
                      {r === 'ADMIN' && 'Модерация, просмотр логов, управление расами (просмотр)'}
                      {r === 'MODERATOR' && 'Баны и муты игроков'}
                      {r === 'PLAYER' && 'Обычный игрок'}
                    </p>
                  </div>
                  <input
                    type="radio"
                    name="role"
                    checked={role === r}
                    disabled={!canChangeRole}
                    onChange={() => setRole(r)}
                    className="h-4 w-4 accent-neon-cyan"
                  />
                </label>
              ))}
              <button
                type="button"
                disabled={!canChangeRole || pending || role === user.role}
                onClick={() =>
                  void run(
                    () => api.patch(`/admin/users/${user.id}/role`, { role }),
                    `Роль изменена на ${ROLE_LABEL[role]}`,
                  )
                }
                className="btn-primary w-full"
              >
                {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Crown className="h-4 w-4" />}
                Применить роль
              </button>
            </div>
          )}

          {/* ── Раса ── */}
          {tab === 'race' && (
            <div className="space-y-3">
              <p className="text-xs text-ink-dim">
                Принудительная смена расы игнорирует кулдаун и синхронизируется с сервером.
              </p>
              <select
                value={raceSlug}
                onChange={(e) => setRaceSlug(e.target.value)}
                className="input cursor-pointer"
                aria-label="Раса игрока"
              >
                <option value="" className="bg-void-800">— без расы —</option>
                {races.map((r) => (
                  <option key={r.id} value={r.slug} className="bg-void-800">
                    {r.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={pending}
                onClick={() =>
                  void run(
                    () => api.post(`/admin/users/${user.id}/race`, { raceSlug: raceSlug || null }),
                    'Раса изменена',
                  )
                }
                className="btn-primary w-full"
              >
                {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                Установить расу
              </button>
            </div>
          )}

          {/* ── Баланс ── */}
          {tab === 'balance' && (
            <div className="space-y-4">
              <div className="glass !bg-void-900/60 p-4 text-center">
                <p className="text-xs uppercase tracking-wider text-ink-dim">Текущий баланс</p>
                <p className="mt-1 font-display text-2xl font-bold text-ink">{formatNumber(user.balance)}</p>
              </div>

              <div>
                <label htmlFor="amount" className="label">Сумма (отрицательная — списать)</label>
                <input
                  id="amount"
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="input"
                />
              </div>

              <div>
                <label htmlFor="balanceReason" className="label">Причина</label>
                <input
                  id="balanceReason"
                  type="text"
                  value={balanceReason}
                  onChange={(e) => setBalanceReason(e.target.value)}
                  className="input"
                  placeholder="Награда за ивент"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={pending || !balanceReason || !Number.isFinite(Number(amount))}
                  onClick={() =>
                    void run(
                      () =>
                        api.post(`/admin/users/${user.id}/balance`, {
                          amount: Math.round(Number(amount)),
                          reason: balanceReason,
                        }),
                      'Баланс изменён',
                    )
                  }
                  className="btn-primary flex-1"
                >
                  <Coins className="h-4 w-4" />
                  Применить
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
