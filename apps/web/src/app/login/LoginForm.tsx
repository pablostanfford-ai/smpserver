'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { LogIn, Loader2, Eye, EyeOff } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/components/ui/Toast';
import type { SessionUser } from '@/lib/types';

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { setUser } = useAuth();
  const { toast } = useToast();

  const [form, setForm] = useState({ login: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const res = await api.post<{ user: SessionUser }>('/auth/login', form, { skipRefresh: true });
      setUser(res.user);
      toast(`С возвращением, ${res.user.username}!`, 'success');
      router.push(params.get('next') ?? '/dashboard');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Не удалось войти');
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-md flex-col justify-center">
      <div className="glass p-8">
        <div className="mb-8 text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br from-neon-cyan to-neon-violet shadow-glow-cyan">
            <LogIn className="h-6 w-6 text-void-950" />
          </div>
          <h1 className="mt-4 font-display text-2xl font-bold text-ink">Вход в аккаунт</h1>
          <p className="mt-1.5 text-sm text-ink-muted">Используйте email, логин или ник Minecraft</p>
        </div>

        <form onSubmit={submit} className="space-y-4" noValidate>
          <div>
            <label htmlFor="login" className="label">Email или логин</label>
            <input
              id="login"
              type="text"
              autoComplete="username"
              required
              value={form.login}
              onChange={(e) => setForm({ ...form, login: e.target.value })}
              className="input"
              placeholder="steve@example.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="label">Пароль</label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="input pr-11"
                placeholder="••••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-dim transition-colors hover:text-ink"
                aria-label={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {error && (
            <p role="alert" className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
              {error}
            </p>
          )}

          <button type="submit" disabled={pending} className="btn-primary w-full !py-3">
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
            {pending ? 'Входим…' : 'Войти'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-ink-muted">
          Нет аккаунта?{' '}
          <Link href="/register" className="font-medium text-neon-cyan hover:underline">
            Зарегистрироваться
          </Link>
        </p>
      </div>
    </div>
  );
}
