'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { LayoutDashboard, Users, Sparkles, Settings, ScrollText, Loader2, ShieldAlert } from 'lucide-react';
import { useAuth, hasRole } from '@/lib/auth-context';
import { cn } from '@/lib/utils';

const ADMIN_NAV = [
  { href: '/admin', label: 'Обзор', Icon: LayoutDashboard, exact: true },
  { href: '/admin/users', label: 'Игроки', Icon: Users },
  { href: '/admin/races', label: 'Расы', Icon: Sparkles },
  { href: '/admin/settings', label: 'Настройки', Icon: Settings, ownerOnly: true },
  { href: '/admin/logs', label: 'Логи', Icon: ScrollText },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.push('/login?next=/admin');
      return;
    }
    if (!hasRole(user, 'MODERATOR')) {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-neon-cyan" />
      </div>
    );
  }

  if (!user || !hasRole(user, 'MODERATOR')) {
    return (
      <div className="glass mx-auto max-w-md p-8 text-center">
        <ShieldAlert className="mx-auto h-8 w-8 text-rose-400" />
        <p className="mt-3 text-sm text-ink-muted">Доступ только для администрации сервера.</p>
      </div>
    );
  }

  const isOwner = user.role === 'OWNER';

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      <aside className="lg:w-56 lg:shrink-0">
        <div className="glass sticky top-24 p-3">
          <div className="mb-2 px-3 py-2">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-ink-dim">Админ-панель</p>
            <p className="mt-1 truncate text-sm font-medium text-ink">{user.username}</p>
            <p className="text-[11px] text-neon-cyan">{isOwner ? 'Владелец' : user.role === 'ADMIN' ? 'Администратор' : 'Модератор'}</p>
          </div>

          <nav className="flex gap-1 overflow-x-auto lg:flex-col">
            {ADMIN_NAV.filter((item) => !item.ownerOnly || isOwner).map(({ href, label, Icon, exact }) => {
              const active = exact ? pathname === href : pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    'flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    active ? 'bg-neon-cyan/10 text-neon-cyan' : 'text-ink-muted hover:bg-white/5 hover:text-ink',
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Link>
              );
            })}
          </nav>
        </div>
      </aside>

      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
