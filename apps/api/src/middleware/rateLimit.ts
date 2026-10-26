import rateLimit, { type Options } from 'express-rate-limit';
import type { Request } from 'express';

const base: Partial<Options> = {
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    error: {
      code: 'RATE_LIMITED',
      message: 'Слишком много попыток. Попробуйте позже.',
    },
  },
};

const keyByIp = (req: Request) => req.ip ?? 'unknown';

/** Общий лимит на API — защита от парсинга и флуда. */
export const globalLimiter = rateLimit({
  ...base,
  windowMs: 60_000,
  limit: 300,
});

/** Жёсткий лимит на логин/регистрацию — защита от брутфорса. */
export const authLimiter = rateLimit({
  ...base,
  windowMs: 15 * 60_000,
  limit: 10,
  keyGenerator: keyByIp,
  skipSuccessfulRequests: true,
});

/** Лимит на проверку ника в Mojang (внешний API, не хотим его ддосить). */
export const mojangLimiter = rateLimit({
  ...base,
  windowMs: 60_000,
  limit: 20,
});

/** Мутирующие действия админки — отдельный, более мягкий лимит. */
export const adminWriteLimiter = rateLimit({
  ...base,
  windowMs: 60_000,
  limit: 60,
});
