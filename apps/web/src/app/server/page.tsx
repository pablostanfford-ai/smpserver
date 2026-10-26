'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Copy, Check, Download, Terminal, Shield, Zap, Users } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/components/ui/Toast';
import { copyToClipboard } from '@/lib/utils';

const STEPS = [
  {
    Icon: Download,
    title: 'Установите Minecraft',
    text: 'Нужен официальный лаунчер Minecraft Java Edition. Пиратские клиенты не поддерживаются — вход только по лицензии.',
  },
  {
    Icon: Terminal,
    title: 'Добавьте сервер',
    text: 'В главном меню: «Сетевая игра» → «Добавить сервер». Вставьте IP и название, затем подключитесь.',
  },
  {
    Icon: Users,
    title: 'Зарегистрируйтесь на сайте',
    text: 'Привяжите свой ник Minecraft к аккаунту, чтобы выбрать расу и получать награды.',
  },
  {
    Icon: Zap,
    title: 'Выберите расу',
    text: 'Раса применяется автоматически через RCON. Сменить её можно раз в неделю в личном кабинете.',
  },
];

export default function ServerPage() {
  const { settings } = useAuth();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const ip = settings?.['server.ip'] ?? 'play.aethersmp.net';
  const port = settings?.['server.port'] ?? '25565';
  const version = settings?.['server.version'] ?? '1.21.4';

  const copy = async () => {
    const ok = await copyToClipboard(ip);
    setCopied(ok);
    toast(ok ? 'IP скопирован в буфер обмена' : 'Не удалось скопировать', ok ? 'success' : 'error');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col gap-12">
      <header className="max-w-2xl">
        <p className="text-xs font-semibold uppercase tracking-widest text-neon-cyan">Подключение</p>
        <h1 className="mt-2 font-display text-4xl font-bold tracking-tight text-ink sm:text-5xl">
          Как попасть на сервер
        </h1>
        <p className="mt-4 text-base leading-relaxed text-ink-muted">
          Четыре шага — и вы в игре. Сервер работает круглосуточно на Java {version}.
        </p>
      </header>

      {/* IP-блок */}
      <section className="glass relative overflow-hidden p-8 text-center">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-radial-fade" />
        <p className="text-xs uppercase tracking-widest text-ink-dim">IP сервера</p>
        <button
          type="button"
          onClick={copy}
          className="group mx-auto mt-3 flex items-center gap-3 rounded-xl border border-white/10 bg-void-900/60 px-6 py-4 font-mono text-2xl text-ink transition-all hover:border-neon-cyan/40 hover:shadow-glow-cyan sm:text-3xl"
        >
          {ip}
          {copied ? (
            <Check className="h-5 w-5 text-emerald-400" />
          ) : (
            <Copy className="h-5 w-5 text-ink-dim transition-colors group-hover:text-neon-cyan" />
          )}
        </button>
        <p className="mt-3 text-sm text-ink-dim">
          Порт: <span className="font-mono text-ink-muted">{port}</span> · Версия:{' '}
          <span className="font-mono text-ink-muted">{version}</span>
        </p>
      </section>

      {/* Шаги */}
      <section className="grid gap-5 sm:grid-cols-2">
        {STEPS.map(({ Icon, title, text }, i) => (
          <div key={title} className="glass glass-hover p-6">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/[0.03] text-neon-cyan">
                <Icon className="h-5 w-5" />
              </span>
              <span className="font-mono text-xs text-ink-dim">0{i + 1}</span>
            </div>
            <h2 className="mt-4 font-display text-lg font-semibold text-ink">{title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-muted">{text}</p>
          </div>
        ))}
      </section>

      <section className="glass flex flex-col items-start gap-4 p-6 sm:flex-row sm:items-center">
        <Shield className="h-8 w-8 shrink-0 text-neon-lime" />
        <div className="flex-1">
          <h2 className="font-display text-lg font-semibold text-ink">Правила сервера</h2>
          <p className="mt-1 text-sm text-ink-muted">
            Читы, X-Ray и гриф ферм запрещены. Уважайте других игроков — за нарушение выдаётся бан или мут.
          </p>
        </div>
        <Link href="/register" className="btn-primary shrink-0">
          Создать аккаунт
        </Link>
      </section>
    </div>
  );
}
