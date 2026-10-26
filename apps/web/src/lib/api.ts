/**
 * Тонкий клиент REST API.
 * - credentials: 'include' — cookies едут автоматически (same-origin через rewrites Next).
 * - Автоматически дублирует CSRF-cookie в заголовок для мутирующих запросов.
 * - При 401 один раз пробует refresh и повторяет запрос.
 */

export const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? '/api';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code = 'ERROR',
    public readonly details?: Record<string, string[]>,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

let refreshPromise: Promise<boolean> | null = null;

/** Одновременные 401 не должны порождать пачку refresh-запросов. */
async function refreshSession(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const res = await fetch(`${API_BASE}/auth/refresh`, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'X-CSRF-Token': readCookie('aether_csrf') ?? '',
          },
        });
        return res.ok;
      } catch {
        return false;
      } finally {
        setTimeout(() => {
          refreshPromise = null;
        }, 0);
      }
    })();
  }
  return refreshPromise;
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  /** Не пытаться обновить сессию при 401 (для самих auth-эндпоинтов) */
  skipRefresh?: boolean;
}

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, skipRefresh, headers, ...rest } = options;
  const method = rest.method ?? (body !== undefined ? 'POST' : 'GET');
  const isMutation = !['GET', 'HEAD', 'OPTIONS'].includes(method.toUpperCase());

  const doRequest = async (): Promise<Response> =>
    fetch(`${API_BASE}${path}`, {
      ...rest,
      method,
      credentials: 'include',
      headers: {
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(isMutation ? { 'X-CSRF-Token': readCookie('aether_csrf') ?? '' } : {}),
        ...headers,
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      cache: 'no-store',
    });

  let res = await doRequest();

  if (res.status === 401 && !skipRefresh && !path.startsWith('/auth/')) {
    const refreshed = await refreshSession();
    if (refreshed) res = await doRequest();
  }

  if (res.status === 204) return undefined as T;

  const text = await res.text();
  const data = text ? (JSON.parse(text) as unknown) : null;

  if (!res.ok) {
    const err = (data as { error?: { message?: string; code?: string; details?: Record<string, string[]> } })
      ?.error;
    throw new ApiError(
      res.status,
      err?.message ?? `Ошибка запроса (${res.status})`,
      err?.code ?? 'ERROR',
      err?.details,
    );
  }

  return data as T;
}

export const api = {
  get: <T>(path: string) => apiFetch<T>(path),
  post: <T>(path: string, body?: unknown, opts?: RequestOptions) =>
    apiFetch<T>(path, { ...opts, method: 'POST', body }),
  patch: <T>(path: string, body?: unknown) => apiFetch<T>(path, { method: 'PATCH', body }),
  put: <T>(path: string, body?: unknown) => apiFetch<T>(path, { method: 'PUT', body }),
  delete: <T>(path: string) => apiFetch<T>(path, { method: 'DELETE' }),
};
