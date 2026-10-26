'use client';

import Link from 'next/link';
import { MessageCircle, Youtube, Send, Globe } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

export function SiteFooter() {
  const { settings } = useAuth();
  const year = new Date().getFullYear();

  const socials = [
    { href: settings?.['site.discordUrl'], label: 'Discord', Icon: MessageCircle },
    { href: settings?.['site.vkUrl'], label: 'VK', Icon: Globe },
    { href: settings?.['site.youtubeUrl'], label: 'YouTube', Icon: Youtube },
    { href: settings?.['site.telegramUrl'], label: 'Telegram', Icon: Send },
  ].filter((s) => s.href);

  return (
    <footer className="mt-24 border-t border-white/[0.06] bg-void-950/60">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-12 sm:px-6 lg:px-8">
        <div className="flex flex-col justify-between gap-8 md:flex-row">
          <div className="max-w-sm">
            <div className="mb-3 flex items-center gap-2.5">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-neon-cyan to-neon-violet">
                <span className="font-display text-sm font-bold text-void-950">A</span>
              </span>
              <span className="font-display text-base font-bold text-ink">
                {settings?.['site.name'] ?? 'AetherSMP'}
              </span>
            </div>
            <p className="text-sm leading-relaxed text-ink-muted">
              {settings?.['site.description'] ??
                'Ванильное выживание с кастомными расами, экономикой и живым сообществом.'}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            <div>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-ink-dim">Игра</h3>
              <ul className="space-y-2 text-sm">
                <li><Link href="/races" className="text-ink-muted transition-colors hover:text-ink">Расы</Link></li>
                <li><Link href="/server" className="text-ink-muted transition-colors hover:text-ink">Подключение</Link></li>
                <li><Link href="/register" className="text-ink-muted transition-colors hover:text-ink">Регистрация</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-ink-dim">Аккаунт</h3>
              <ul className="space-y-2 text-sm">
                <li><Link href="/login" className="text-ink-muted transition-colors hover:text-ink">Вход</Link></li>
                <li><Link href="/dashboard" className="text-ink-muted transition-colors hover:text-ink">Кабинет</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-ink-dim">Сервер</h3>
              <p className="font-mono text-sm text-neon-cyan">{settings?.['server.ip'] ?? '—'}</p>
              <p className="mt-1 text-xs text-ink-dim">
                Java {settings?.['server.version'] ?? ''}
              </p>
            </div>
          </div>
        </div>

        <div className="divider" />

        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <p className="text-xs text-ink-dim">
            © {year} {settings?.['site.name'] ?? 'AetherSMP'}. Не аффилирован с Mojang AB.
          </p>
          {socials.length > 0 && (
            <div className="flex items-center gap-2">
              {socials.map(({ href, label, Icon }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  aria-label={label}
                  className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 text-ink-muted transition-all hover:border-neon-cyan/40 hover:text-neon-cyan"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </footer>
  );
}
