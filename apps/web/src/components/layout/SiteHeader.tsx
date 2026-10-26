'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { Menu, X, LayoutDashboard, Shield, LogIn, LogOut, Copy, Check } from 'lucide-react';
import { useAuth, hasRole } from '@/lib/auth-context';
import { cn, copyToClipboard } from '@/lib/utils';
import { useToast } from '@/components/ui/Toast';

const NAV = [
  { href: '/', label: 'Главная' },
  { href: '/races', label: 'Расы' },
  { href: '/server', label: 'Сервер' },
];

export function SiteHeader() {
  const { user, settings, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const siteName = settings?.['site.name'] ?? 'AetherSMP';
  const serverIp = settings?.['server.ip'] ?? 'play.aethersmp.net';

  const copyIp = async () => {
    const ok = await copyToClipboard(serverIp);
    setCopied(ok);
    toast(ok ? `IP ${serverIp} скопирован` : 'Не удалось скопировать', ok ? 'success' : 'error');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLogout = async () => {
    await logout();
    toast('Вы вышли из аккаунта', 'info');
    router.push('/');
  };

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-white/[0.06] bg-void-950/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="group flex items-center gap-2.5">
          <span className="relative grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-neon-cyan to-neon-violet shadow-glow-cyan transition-transform group-hover:scale-105">
            <span className="font-display text-lg font-bold text-void-950">A</span>
          </span>
          <span className="font-display text-lg font-bold tracking-tight text-ink">
            {siteName}
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {NAV.map((item) => {
            const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'rounded-lg px-3.5 py-2 text-sm font-medium transition-colors',
                  active ? 'bg-white/[0.07] text-ink' : 'text-ink-muted hover:text-ink',
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <button
            type="button"
            onClick={copyIp}
            className="group flex items-center gap-2 rounded-lg border border-white/10 bg-void-800/60 px-3 py-1.5 font-mono text-xs text-ink-muted transition-colors hover:border-neon-cyan/40 hover:text-ink"
            title="Скопировать IP сервера"
          >
            <span className="h-1.5 w-1.5 animate-pulse-glow rounded-full bg-emerald-400" />
            {serverIp}
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5 opacity-50 group-hover:opacity-100" />}
          </button>

          {user ? (
            <>
              {hasRole(user, 'MODERATOR') && (
                <Link href="/admin" className="btn-ghost !px-3" title="Админ-панель">
                  <Shield className="h-4 w-4" />
                </Link>
              )}
              <Link href="/dashboard" className="btn-secondary !px-3.5 !py-2">
                <LayoutDashboard className="h-4 w-4" />
                {user.username}
              </Link>
              <button type="button" onClick={handleLogout} className="btn-ghost !px-2.5" title="Выйти">
                <LogOut className="h-4 w-4" />
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="btn-ghost">
                <LogIn className="h-4 w-4" />
                Войти
              </Link>
              <Link href="/register" className="btn-primary">
                Начать играть
              </Link>
            </>
          )}
        </div>

        <button
          type="button"
          className="btn-ghost !px-2 md:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label="Меню"
          aria-expanded={open}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-white/[0.06] bg-void-900/95 px-4 py-4 md:hidden">
          <nav className="flex flex-col gap-1">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-ink-muted hover:bg-white/5 hover:text-ink"
              >
                {item.label}
              </Link>
            ))}
            <div className="my-2 divider" />
            {user ? (
              <>
                {hasRole(user, 'MODERATOR') && (
                  <Link href="/admin" onClick={() => setOpen(false)} className="rounded-lg px-3 py-2.5 text-sm text-ink-muted hover:bg-white/5 hover:text-ink">
                    Админ-панель
                  </Link>
                )}
                <Link href="/dashboard" onClick={() => setOpen(false)} className="rounded-lg px-3 py-2.5 text-sm text-ink-muted hover:bg-white/5 hover:text-ink">
                  Личный кабинет
                </Link>
                <button type="button" onClick={handleLogout} className="rounded-lg px-3 py-2.5 text-left text-sm text-rose-300 hover:bg-white/5">
                  Выйти
                </button>
              </>
            ) : (
              <>
                <Link href="/login" onClick={() => setOpen(false)} className="rounded-lg px-3 py-2.5 text-sm text-ink-muted hover:bg-white/5 hover:text-ink">
                  Войти
                </Link>
                <Link href="/register" onClick={() => setOpen(false)} className="btn-primary mt-2">
                  Начать играть
                </Link>
              </>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
