'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { UserPlus, Loader2, Check, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/components/ui/Toast';
import { McNameField } from '@/components/auth/McNameField';
import { RaceIcon } from '@/components/ui/RaceIcon';
import { cn } from '@/lib/utils';
import type { Race, SessionUser } from '@/lib/types';

type Step = 1 | 2;

const PASSWORD_RULES = [
  { test: (p: string) => p.length >= 10, label: 'Минимум 10 символов' },
  { test: (p: string) => /[A-ZА-Я]/.test(p), label: 'Заглавная буква' },
  { test: (p: string) => /[a-zа-я]/.test(p), label: 'Строчная буква' },
  { test: (p: string) => /\d/.test(p), label: 'Цифра' },
];

export function RegisterForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { setUser } = useAuth();
  const { toast } = useToast();

  const [step, setStep] = useState<Step>(1);
  const [races, setRaces] = useState<Race[] | null>(null);
  const [form, setForm] = useState({
    email: '',
    username: '',
    password: '',
    mcName: '',
    raceSlug: params.get('race') ?? '',
    acceptRules: false,
  });
  const [mcValid, setMcValid] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [pending, setPending] = useState(false);

  const loadRaces = async () => {
    if (races) return;
    try {
      const data = await api.get<{ races: Race[] }>('/races');
      setRaces(data.races.filter((r) => r.isSelectable));
    } catch {
      setRaces([]);
    }
  };

  const goToStep2 = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!mcValid) {
      setError('Сначала проверьте ник Minecraft');
      return;
    }
    if (form.password.length < 10 || !PASSWORD_RULES.every((r) => r.test(form.password))) {
      setError('Пароль не соответствует требованиям');
      return;
    }
    void loadRaces();
    setStep(2);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    setPending(true);

    try {
      const res = await api.post<{ user: SessionUser }>(
        '/auth/register',
        {
          email: form.email,
          username: form.username,
          password: form.password,
          mcName: form.mcName,
          ...(form.raceSlug ? { raceSlug: form.raceSlug } : {}),
          acceptRules: form.acceptRules,
        },
        { skipRefresh: true },
      );
      setUser(res.user);
      toast('Аккаунт создан! Добро пожаловать на AetherSMP', 'success');
      router.push('/dashboard');
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
        if (err.details) setFieldErrors(err.details);
      } else {
        setError('Не удалось зарегистрироваться');
      }
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col justify-center py-6">
      <div className="glass overflow-hidden">
        {/* Прогресс */}
        <div className="flex items-center gap-3 border-b border-white/[0.06] px-8 py-5">
          {[
            { n: 1 as Step, label: 'Аккаунт' },
            { n: 2 as Step, label: 'Раса' },
          ].map(({ n, label }) => (
            <div key={n} className="flex flex-1 items-center gap-3">
              <span
                className={cn(
                  'grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold transition-colors',
                  step >= n ? 'bg-neon-cyan text-void-950' : 'bg-void-600 text-ink-dim',
                )}
              >
                {step > n ? <Check className="h-3.5 w-3.5" /> : n}
              </span>
              <span className={cn('text-sm font-medium', step >= n ? 'text-ink' : 'text-ink-dim')}>
                {label}
              </span>
              {n === 1 && <div className="mx-2 h-px flex-1 bg-white/10" />}
            </div>
          ))}
        </div>

        <div className="p-8">
          {step === 1 ? (
            <form onSubmit={goToStep2} className="space-y-4" noValidate>
              <div>
                <h1 className="font-display text-2xl font-bold text-ink">Создать аккаунт</h1>
                <p className="mt-1 text-sm text-ink-muted">Шаг 1 из 2 — данные аккаунта</p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="email" className="label">Email</label>
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="input"
                    placeholder="steve@example.com"
                  />
                  {fieldErrors.email && <p className="mt-1 text-xs text-rose-300">{fieldErrors.email[0]}</p>}
                </div>

                <div>
                  <label htmlFor="username" className="label">Логин на сайте</label>
                  <input
                    id="username"
                    type="text"
                    autoComplete="username"
                    required
                    minLength={3}
                    maxLength={24}
                    value={form.username}
                    onChange={(e) => setForm({ ...form, username: e.target.value.replace(/[^A-Za-z0-9_]/g, '') })}
                    className="input"
                    placeholder="steve_2026"
                  />
                  {fieldErrors.username && <p className="mt-1 text-xs text-rose-300">{fieldErrors.username[0]}</p>}
                </div>
              </div>

              <McNameField
                value={form.mcName}
                onChange={(mcName) => setForm({ ...form, mcName })}
                onValidChange={setMcValid}
              />
              {fieldErrors.mcName && <p className="text-xs text-rose-300">{fieldErrors.mcName[0]}</p>}

              <div>
                <label htmlFor="password" className="label">Пароль</label>
                <input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="input"
                  placeholder="••••••••••"
                />
                <ul className="mt-2.5 grid grid-cols-2 gap-1.5">
                  {PASSWORD_RULES.map((rule) => {
                    const ok = rule.test(form.password);
                    return (
                      <li
                        key={rule.label}
                        className={cn(
                          'flex items-center gap-1.5 text-xs transition-colors',
                          ok ? 'text-emerald-400' : 'text-ink-dim',
                        )}
                      >
                        <Check className={cn('h-3 w-3', !ok && 'opacity-30')} />
                        {rule.label}
                      </li>
                    );
                  })}
                </ul>
              </div>

              {error && (
                <p role="alert" className="flex items-start gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  {error}
                </p>
              )}

              <button type="submit" className="btn-primary w-full !py-3">
                Далее — выбор расы
                <ChevronRight className="h-4 w-4" />
              </button>

              <p className="text-center text-sm text-ink-muted">
                Уже есть аккаунт?{' '}
                <Link href="/login" className="font-medium text-neon-cyan hover:underline">
                  Войти
                </Link>
              </p>
            </form>
          ) : (
            <form onSubmit={submit} className="space-y-5">
              <div>
                <h1 className="font-display text-2xl font-bold text-ink">Выберите расу</h1>
                <p className="mt-1 text-sm text-ink-muted">
                  Шаг 2 из 2 — можно пропустить и выбрать позже в кабинете
                </p>
              </div>

              {races === null ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="skeleton h-24" />
                  ))}
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {races.map((race) => {
                    const selected = form.raceSlug === race.slug;
                    return (
                      <button
                        key={race.id}
                        type="button"
                        onClick={() => setForm({ ...form, raceSlug: selected ? '' : race.slug })}
                        className={cn(
                          'flex items-start gap-3 rounded-xl border p-4 text-left transition-all',
                          selected
                            ? 'border-transparent bg-white/[0.06]'
                            : 'border-white/10 hover:border-white/20 hover:bg-white/[0.03]',
                        )}
                        style={selected ? { boxShadow: `0 0 0 1px ${race.color}, 0 0 24px -8px ${race.color}` } : undefined}
                      >
                        <span
                          className="grid h-10 w-10 shrink-0 place-items-center rounded-lg"
                          style={{ background: `${race.color}1a`, color: race.color }}
                        >
                          <RaceIcon name={race.icon} className="h-5 w-5" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-2">
                            <span className="font-semibold text-ink">{race.name}</span>
                            {selected && <Check className="h-3.5 w-3.5 text-emerald-400" />}
                          </span>
                          <span className="mt-0.5 block truncate text-xs text-ink-muted">{race.tagline}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              <label className="flex cursor-pointer items-start gap-2.5 text-sm text-ink-muted">
                <input
                  type="checkbox"
                  checked={form.acceptRules}
                  onChange={(e) => setForm({ ...form, acceptRules: e.target.checked })}
                  className="mt-0.5 h-4 w-4 shrink-0 rounded border-white/20 bg-void-900 accent-neon-cyan"
                  required
                />
                <span>
                  Я принимаю правила сервера и согласен на обработку данных аккаунта.
                </span>
              </label>

              {error && (
                <p role="alert" className="flex items-start gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  {error}
                </p>
              )}

              <div className="flex gap-3">
                <button type="button" onClick={() => setStep(1)} className="btn-secondary">
                  <ChevronLeft className="h-4 w-4" />
                  Назад
                </button>
                <button type="submit" disabled={pending || !form.acceptRules} className="btn-primary flex-1 !py-3">
                  {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                  {pending ? 'Создаём аккаунт…' : 'Зарегистрироваться'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
