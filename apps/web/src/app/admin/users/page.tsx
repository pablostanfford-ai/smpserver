'use client';

import { useCallback, useEffect, useState } from 'react';
import { Search, Loader2, ChevronLeft, ChevronRight, UserCog } from 'lucide-react';
import { PlayerSkin } from '@/components/ui/PlayerSkin';
import { api, ApiError } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import { UserManageDialog } from '@/components/admin/UserManageDialog';
import { cn, formatRelative, ROLE_LABEL, STATUS_LABEL } from '@/lib/utils';
import type { AdminUserRow, Pagination, Role, UserStatus } from '@/lib/types';

const ROLE_STYLES: Record<Role, string> = {
  OWNER: 'border-neon-violet/40 bg-neon-violet/10 text-neon-violet',
  ADMIN: 'border-neon-cyan/40 bg-neon-cyan/10 text-neon-cyan',
  MODERATOR: 'border-amber-500/40 bg-amber-500/10 text-amber-300',
  PLAYER: 'border-white/10 bg-white/5 text-ink-muted',
};

const STATUS_STYLES: Record<UserStatus, string> = {
  ACTIVE: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
  MUTED: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
  BANNED: 'border-rose-500/30 bg-rose-500/10 text-rose-300',
};

export default function AdminUsersPage() {
  const { toast } = useToast();

  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, perPage: 20, total: 0, pages: 1 });
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [role, setRole] = useState<Role | ''>('');
  const [status, setStatus] = useState<UserStatus | ''>('');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<AdminUserRow | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 350);
    return () => clearTimeout(t);
  }, [query]);

  const load = useCallback(
    async (page = 1) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ page: String(page), perPage: '20' });
        if (debouncedQuery) params.set('q', debouncedQuery);
        if (role) params.set('role', role);
        if (status) params.set('status', status);

        const data = await api.get<{ users: AdminUserRow[]; pagination: Pagination }>(
          `/admin/users?${params.toString()}`,
        );
        setUsers(data.users);
        setPagination(data.pagination);
      } catch (err) {
        toast(err instanceof ApiError ? err.message : 'Не удалось загрузить игроков', 'error');
      } finally {
        setLoading(false);
      }
    },
    [debouncedQuery, role, status, toast],
  );

  useEffect(() => {
    void load(1);
  }, [load]);

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold text-ink">Игроки</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Всего: {pagination.total} · Страница {pagination.page} из {pagination.pages}
          </p>
        </div>
      </header>

      {/* Фильтры */}
      <div className="glass flex flex-col gap-3 p-4 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-dim" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Поиск по нику, логину или email…"
            className="input pl-10"
            aria-label="Поиск игроков"
          />
        </div>

        <select
          value={role}
          onChange={(e) => setRole(e.target.value as Role | '')}
          className="input cursor-pointer sm:w-44"
          aria-label="Фильтр по роли"
        >
          <option value="" className="bg-void-800">Все роли</option>
          {(Object.keys(ROLE_LABEL) as Role[]).map((r) => (
            <option key={r} value={r} className="bg-void-800">{ROLE_LABEL[r]}</option>
          ))}
        </select>

        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as UserStatus | '')}
          className="input cursor-pointer sm:w-40"
          aria-label="Фильтр по статусу"
        >
          <option value="" className="bg-void-800">Все статусы</option>
          {(Object.keys(STATUS_LABEL) as UserStatus[]).map((s) => (
            <option key={s} value={s} className="bg-void-800">{STATUS_LABEL[s]}</option>
          ))}
        </select>
      </div>

      {/* Таблица */}
      <div className="glass overflow-hidden">
        {loading ? (
          <div className="flex min-h-[40vh] items-center justify-center">
            <Loader2 className="h-7 w-7 animate-spin text-neon-cyan" />
          </div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center text-sm text-ink-muted">Игроки не найдены</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/[0.07] text-xs uppercase tracking-wider text-ink-dim">
                  <th className="px-4 py-3 font-medium">Игрок</th>
                  <th className="px-4 py-3 font-medium">Раса</th>
                  <th className="px-4 py-3 font-medium">Роль</th>
                  <th className="px-4 py-3 font-medium">Статус</th>
                  <th className="hidden px-4 py-3 font-medium md:table-cell">Вход</th>
                  <th className="px-4 py-3 text-right font-medium">Действия</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-white/[0.04] transition-colors last:border-0 hover:bg-white/[0.02]">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <PlayerSkin
                          src={u.skins.head}
                          fallbackSrc={u.skins.headFallback}
                          alt={u.mcName}
                          size={36}
                          variant="head"
                          className="!rounded-lg"
                        />
                        <div className="min-w-0">
                          <p className="truncate font-medium text-ink">{u.mcName}</p>
                          <p className="truncate text-xs text-ink-dim">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {u.race ? (
                        <span className="inline-flex items-center gap-1.5 text-xs" style={{ color: u.race.color }}>
                          <span className="h-1.5 w-1.5 rounded-full" style={{ background: u.race.color }} />
                          {u.race.name}
                        </span>
                      ) : (
                        <span className="text-xs text-ink-dim">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('badge', ROLE_STYLES[u.role])}>{ROLE_LABEL[u.role]}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('badge', STATUS_STYLES[u.status])}>{STATUS_LABEL[u.status]}</span>
                    </td>
                    <td className="hidden px-4 py-3 text-xs text-ink-dim md:table-cell">
                      {formatRelative(u.lastLoginAt)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => setSelected(u)}
                        className="btn-ghost !px-2.5 !py-1.5 text-xs"
                      >
                        <UserCog className="h-3.5 w-3.5" />
                        Управление
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {pagination.pages > 1 && (
          <div className="flex items-center justify-between border-t border-white/[0.07] px-4 py-3">
            <button
              type="button"
              disabled={pagination.page <= 1}
              onClick={() => void load(pagination.page - 1)}
              className="btn-ghost !px-3 !py-1.5 text-xs"
            >
              <ChevronLeft className="h-4 w-4" />
              Назад
            </button>
            <span className="text-xs text-ink-dim">
              {pagination.page} / {pagination.pages}
            </span>
            <button
              type="button"
              disabled={pagination.page >= pagination.pages}
              onClick={() => void load(pagination.page + 1)}
              className="btn-ghost !px-3 !py-1.5 text-xs"
            >
              Вперёд
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {selected && (
        <UserManageDialog
          user={selected}
          onClose={() => setSelected(null)}
          onUpdated={() => {
            setSelected(null);
            void load(pagination.page);
          }}
        />
      )}
    </div>
  );
}
