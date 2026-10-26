import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { logger } from './logger';

/**
 * Операционная ошибка с HTTP-статусом и машинным кодом.
 * В ответ клиенту попадает только `message` (без стектрейсов).
 */
export class AppError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code = 'ERROR',
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
  }

  static badRequest(message = 'Некорректный запрос', details?: unknown) {
    return new AppError(400, message, 'BAD_REQUEST', details);
  }
  static unauthorized(message = 'Требуется авторизация') {
    return new AppError(401, message, 'UNAUTHORIZED');
  }
  static forbidden(message = 'Недостаточно прав') {
    return new AppError(403, message, 'FORBIDDEN');
  }
  static notFound(message = 'Не найдено') {
    return new AppError(404, message, 'NOT_FOUND');
  }
  static conflict(message = 'Конфликт данных') {
    return new AppError(409, message, 'CONFLICT');
  }
  static tooMany(message = 'Слишком много попыток') {
    return new AppError(429, message, 'RATE_LIMITED');
  }
}

/** Обёртка для async-хендлеров: пробрасывает reject в error-middleware. */
export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler =>
  (req, res, next) => {
    void Promise.resolve(fn(req, res, next)).catch(next);
  };

export function notFoundHandler(_req: Request, res: Response) {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Эндпоинт не найден' } });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  // Zod — ошибки валидации тела/квери
  if (err instanceof ZodError) {
    return res.status(422).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Проверьте правильность заполнения полей',
        details: err.flatten().fieldErrors,
      },
    });
  }

  if (err instanceof AppError) {
    return res.status(err.status).json({
      error: { code: err.code, message: err.message, details: err.details },
    });
  }

  // Prisma: уникальные ключи, отсутствующие записи, внешние ключи
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      const target = Array.isArray(err.meta?.target) ? (err.meta?.target as string[]).join(', ') : 'поле';
      return res.status(409).json({
        error: { code: 'CONFLICT', message: `Значение уже занято: ${target}` },
      });
    }
    if (err.code === 'P2025') {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Запись не найдена' } });
    }
    logger.error({ err: { code: err.code, meta: err.meta } }, 'prisma.known_error');
  }

  logger.error(
    { err: err instanceof Error ? { message: err.message, stack: err.stack } : err, path: req.path },
    'unhandled_error',
  );

  return res.status(500).json({
    error: { code: 'INTERNAL_ERROR', message: 'Внутренняя ошибка сервера' },
  });
}
