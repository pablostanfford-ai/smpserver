import { env } from '../config/env';
import { AppError } from './errors';
import { logger } from './logger';

export interface MojangProfile {
  uuid: string; // без дефисов
  name: string;
}

const MC_NAME_RE = /^[A-Za-z0-9_]{3,16}$/;

export const isValidMcName = (name: string) => MC_NAME_RE.test(name);

/**
 * Проверка ника через официальный API Mojang.
 * Возвращает UUID и каноническое написание ника либо null, если аккаунт не существует.
 *
 * Документация: https://mojang-api-docs.netlify.app/
 * Эндпоинт отдаёт 204 No Content для неизвестного ника.
 */
export async function lookupMojangProfile(name: string): Promise<MojangProfile | null> {
  if (!isValidMcName(name)) {
    throw AppError.badRequest('Ник Minecraft: 3–16 символов, латиница, цифры и «_»');
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), env.MOJANG_TIMEOUT_MS);

  try {
    const res = await fetch(
      `https://api.mojang.com/users/profiles/minecraft/${encodeURIComponent(name)}`,
      { signal: controller.signal, headers: { Accept: 'application/json' } },
    );

    if (res.status === 204 || res.status === 404) return null;
    if (!res.ok) {
      throw new AppError(502, 'Mojang API недоступен, попробуйте позже', 'MOJANG_UNAVAILABLE');
    }

    const data = (await res.json()) as { id?: string; name?: string };
    if (!data.id || !data.name) return null;

    return { uuid: data.id, name: data.name };
  } catch (err) {
    if (err instanceof AppError) throw err;
    logger.warn({ err: (err as Error).message, name }, 'mojang.lookup_failed');
    throw new AppError(502, 'Не удалось проверить ник в Mojang', 'MOJANG_UNAVAILABLE');
  } finally {
    clearTimeout(timer);
  }
}

/** Нормализованный UUID с дефисами (для Crafatar / плагинов). */
export function formatUuid(uuid: string): string {
  const clean = uuid.replace(/-/g, '');
  if (clean.length !== 32) return uuid;
  return [
    clean.slice(0, 8),
    clean.slice(8, 12),
    clean.slice(12, 16),
    clean.slice(16, 20),
    clean.slice(20, 32),
  ].join('-');
}

/**
 * Публичные CDN для скина и головы.
 *
 * Важно: Crafatar работает ТОЛЬКО по UUID — на ник отвечает 422.
 * Поэтому при отсутствии UUID (аккаунт без проверки Mojang) отдаём Minotar,
 * который умеет и по нику, и по UUID. Иначе на сайте были бы битые аватарки.
 */
export function skinUrls(uuid: string | null, name: string) {
  const encodedName = encodeURIComponent(name);

  if (!uuid) {
    return {
      head: `https://minotar.net/helm/${encodedName}/128.png`,
      body: `https://minotar.net/armor/body/${encodedName}/256.png`,
      headFallback: `https://mc-heads.net/avatar/${encodedName}/128`,
      bodyFallback: `https://mc-heads.net/body/${encodedName}/256`,
    };
  }

  const encodedUuid = encodeURIComponent(uuid);
  return {
    head: `https://crafatar.com/avatars/${encodedUuid}?size=128&overlay`,
    body: `https://crafatar.com/renders/body/${encodedUuid}?size=256&overlay`,
    headFallback: `https://minotar.net/helm/${encodedName}/128.png`,
    bodyFallback: `https://minotar.net/armor/body/${encodedName}/256.png`,
  };
}
