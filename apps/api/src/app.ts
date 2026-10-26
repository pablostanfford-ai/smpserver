import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import pinoHttp from 'pino-http';
import { env } from './config/env';
import { logger } from './lib/logger';
import { errorHandler, notFoundHandler } from './lib/errors';
import { globalLimiter } from './middleware/rateLimit';
import { csrfProtection } from './middleware/csrf';
import { authRouter } from './routes/auth.routes';
import { meRouter } from './routes/me.routes';
import { publicRacesRouter } from './routes/public.routes';
import { miscRouter } from './routes/misc.routes';
import { adminRouter } from './routes/admin';

export function createApp() {
  const app = express();

  // За reverse-proxy (Caddy/Nginx) — доверяем X-Forwarded-* для корректного req.ip
  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'https://crafatar.com', 'https://minotar.net', 'https://mc-heads.net'],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          connectSrc: ["'self'"],
          objectSrc: ["'none'"],
          frameAncestors: ["'none'"],
        },
      },
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
      hsts: env.isProd ? { maxAge: 31_536_000, includeSubDomains: true, preload: true } : false,
    }),
  );

  app.use(
    cors({
      origin(origin, cb) {
        // Разрешаем запросы без Origin (curl, SSR, same-origin) и только из белого списка.
        // Чужой Origin не бросает исключение (иначе получили бы 500) — просто не отдаём
        // CORS-заголовки; сам запрос отклонит CSRF-middleware с корректным 403.
        if (!origin || env.CORS_ORIGINS.includes(origin)) return cb(null, true);
        return cb(null, false);
      },
      credentials: true,
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
      maxAge: 86_400,
    }),
  );

  app.use(express.json({ limit: '256kb' }));
  app.use(express.urlencoded({ extended: false, limit: '64kb' }));
  app.use(cookieParser());

  if (!env.isProd) {
    app.use(
      pinoHttp({
        logger,
        autoLogging: { ignore: (req) => req.url === '/api/health' },
        customLogLevel: (_req, res, err) => {
          if (err || res.statusCode >= 500) return 'error';
          if (res.statusCode >= 400) return 'warn';
          return 'info';
        },
      }),
    );
  }

  app.use('/api', globalLimiter);

  // CSRF применяется ко всем мутирующим методам; публичный health-check исключён
  app.use('/api', (req, res, next) => {
    if (req.path === '/health' || req.method === 'OPTIONS') return next();
    return csrfProtection(req, res, next);
  });

  app.use('/api/auth', authRouter);
  app.use('/api/me', meRouter);
  app.use('/api/races', publicRacesRouter);
  app.use('/api/admin', adminRouter);
  app.use('/api', miscRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
