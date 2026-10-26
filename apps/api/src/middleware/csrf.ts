import crypto from 'node:crypto';
import type { RequestHandler } from 'express';
import { AppError } from '../lib/errors';
import { CSRF_COOKIE, CSRF_HEADER } from '../lib/tokens';
import { env } from '../config/env';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Защита от CSRF по схеме OWASP «Origin verification + double-submit cookie».
 *
 * 1. Для мутирующих методов сначала проверяем Origin (или Referer).
 *    Браузер всегда отправляет Origin на POST/PATCH/DELETE, и подделать его
 *    со стороннего сайта нельзя — поэтому запрос с чужим Origin отклоняется
 *    ещё до обращения к сессии. Это же позволяет логину и регистрации
 *    работать на первом визите, когда CSRF-cookie ещё не выдана.
 * 2. Если Origin отсутствует (curl, мобильный клиент, server-to-server),
 *    требуем double-submit токен: cookie `aether_csrf` должен совпадать
 *    с заголовком `X-CSRF-Token`. Сравнение — timing-safe.
 */
export const csrfProtection: RequestHandler = (req, _res, next) => {
  if (SAFE_METHODS.has(req.method)) return next();

  const origin = req.get('origin');
  const referer = req.get('referer');

  // ── Шаг 1: проверка источника запроса ──
  if (origin) {
    if (!env.CORS_ORIGINS.includes(origin)) {
      return next(new AppError(403, 'Запрос с недопустимого источника', 'CSRF_ORIGIN'));
    }
    return next();
  }

  if (referer) {
    try {
      const refOrigin = new URL(referer).origin;
      if (!env.CORS_ORIGINS.includes(refOrigin)) {
        return next(new AppError(403, 'Запрос с недопустимого источника', 'CSRF_ORIGIN'));
      }
      return next();
    } catch {
      return next(new AppError(403, 'Некорректный Referer', 'CSRF_ORIGIN'));
    }
  }

  // ── Шаг 2: не-браузерный клиент → double-submit токен ──
  const cookieToken = req.cookies?.[CSRF_COOKIE] as string | undefined;
  const headerToken = req.get(CSRF_HEADER);

  if (!cookieToken || !headerToken) {
    return next(new AppError(403, 'CSRF-токен отсутствует', 'CSRF_MISSING'));
  }

  const a = Buffer.from(cookieToken);
  const b = Buffer.from(headerToken);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return next(new AppError(403, 'Неверный CSRF-токен', 'CSRF_INVALID'));
  }

  return next();
};
