'use client';

import { useCallback, useEffect, useState } from 'react';
import { Search, Loader2, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import { cn, formatDate } from '@/lib/utils';
import type { AuditLog, Pagination } from '@/lib/types';

const LEVELS = ['INFO', 'WARN', 'ERROR', 'SECURITY'] as const;
type Level = (typeof LEVELS)[number];

const LEVEL_STYLES: Record<Level, string> = {
  INFO: 'border-white/10 bg-white/5 text-ink-muted',
  WARN: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
  ERROR: 'border-rose-500/30 bg-rose-500/10 text-rose-300',
  SECURITY: 'border-neon-violet/40 bg-neon-violet/10 text-neon-violet',
};

export default function AdminLogsPage() {
  const { toast } = useToast();

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, perPage: 50, total: 0, pages: 1 });
  const [levelCounts, setLevelCounts] = useState<Record<string, number>>({});
  const [level, setLevel] = useState<Level | ''>('');
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 350);
    return () => clearTimeout(t);
  }, [query]);

  const load = useCallback(
    async (page = 1) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ page: String(page), perPage: '50' });
        if (level) params.set('level', level);
        if (debounced) params.set('q', debounced);

        const data = await api.get<{
          logs: AuditLog[];
          pagination: Pagination;
          levelCounts: Record<string, number>;
        }>(`/admin/logs?${params.toString()}`);

        setLogs(data.logs);
        setPagination(data.pagination);
        setLevelCounts(data.levelCounts);
      } catch (err) {
        toast(err instanceof ApiError ? err.message : 'Не удалось загрузить логи', 'error');
      } finally {
        setLoading(false);
      }
    },
    [level, debounced, toast],
  );

  useEffect(() => {
    void load(1);
  }, [load]);

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold text-ink">Системные логи</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Действия администраторов, попытки входа и ошибки · {pagination.total} записей
          </p>
        </div>
        <button type="button" onClick={() => void load(pagination.page)} className="btn-secondary">
          <RefreshCw className="h-4 w-4" />
          Обновить
        </button>
      </header>

      <div className="glass flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-dim" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Поиск по сообщению или автору…"
            className="input pl-10"
            aria-label="Поиск в логах"
          />
        </div>

        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setLevel('')}
            className={cn(
              'rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors',
              !level ? 'border-neon-cyan/40 bg-neon-cyan/10 text-neon-cyan' : 'border-white/10 text-ink-muted hover:text-ink',
            )}
          >
            Все
          </button>
          {LEVELS.map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setLevel(level === l ? '' : l)}
              className={cn(
                'rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors',
                level === l ? LEVEL_STYLES[l] : 'border-white/10 text-ink-muted hover:text-ink',
              )}
            >
              {l}
              {levelCounts[l] ? <span className="ml-1.5 opacity-60">{levelCounts[l]}</span> : null}
            </button>
          ))}
        </div>
      </div>

      <div className="glass overflow-hidden">
        {loading ? (
          <div className="flex min-h-[40vh] items-center justify-center">
            <Loader2 className="h-7 w-7 animate-spin text-neon-cyan" />
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center text-sm text-ink-muted">Записей не найдено</div>
        ) : (
          <ul className="divide-y divide-white/[0.05]">
            {logs.map((log) => (
              <li key={log.id}>
                <button
                  type="button"
                  onClick={() => setExpanded(expanded === log.id ? null : log.id)}
                  className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-white/[0.02]"
                >
                  <span className={cn('badge mt-0.5 shrink-0', LEVEL_STYLES[log.level])}>{log.level}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm text-ink">{log.message}</span>
                    <span className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-ink-dim">
                      <code className="font-mono text-neon-cyan/80">{log.action}</code>
                      <span>{log.actorName}</span>
                      <span>{formatDate(log.createdAt)}</span>
                    </span>
                  </span>
                </button>

                {expanded === log.id && (
                  <div className="border-t border-white/[0.05] bg-void-900/40 px-4 py-3">
                    <dl className="grid gap-2 text-xs sm:grid-cols-2">
                      <div>
                        <dt className="text-ink-dim">Цель</dt>
                        <dd className="font-mono text-ink-muted">
                          {log.targetType ?? '—'} {log.targetId ?? ''}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-ink-dim">Автор</dt>
                        <dd className="text-ink-muted">
                          {log.actor ? `${log.actor.username} (${log.actor.mcName})` : log.actorName}
                        </dd>
                      </div>
                    </dl>
                    {Object.keys(log.meta ?? {}).length > 0 && (
                      <pre className="mt-3 overflow-x-auto rounded-lg bg-void-950/80 p-3 font-mono text-[11px] text-ink-muted">
                        {JSON.stringify(log.meta, null, 2)}
                      </pre>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
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
            <span className="text-xs text-ink-dim">{pagination.page} / {pagination.pages}</span>
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
    </div>
  );
}
