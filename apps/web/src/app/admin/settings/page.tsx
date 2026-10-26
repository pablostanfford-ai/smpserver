'use client';

import { useEffect, useState } from 'react';
import { Save, Loader2, Globe, Server, Wrench, Link2 } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import { cn } from '@/lib/utils';
import type { SiteSettings } from '@/lib/types';

type SettingsForm = Record<string, string | boolean>;

const GROUPS: Array<{
  key: string;
  title: string;
  Icon: typeof Globe;
  fields: Array<{ key: keyof SiteSettings; label: string; hint?: string; type: 'text' | 'url' | 'toggle' | 'textarea' }>;
}> = [
  {
    key: 'brand',
    title: 'Брендинг',
    Icon: Globe,
    fields: [
      { key: 'site.name', label: 'Название сервера', type: 'text' },
      { key: 'site.tagline', label: 'Подзаголовок', type: 'text' },
      { key: 'site.description', label: 'Описание', hint: 'Используется в SEO и футере', type: 'textarea' },
      { key: 'site.logoUrl', label: 'URL логотипа', type: 'url' },
      { key: 'site.heroImageUrl', label: 'URL фонового баннера', type: 'url' },
    ],
  },
  {
    key: 'server',
    title: 'Игровой сервер',
    Icon: Server,
    fields: [
      { key: 'server.ip', label: 'IP для подключения', hint: 'Показывается в шапке и на странице сервера', type: 'text' },
      { key: 'server.port', label: 'Порт', type: 'text' },
      { key: 'server.version', label: 'Версия Minecraft', type: 'text' },
    ],
  },
  {
    key: 'social',
    title: 'Ссылки',
    Icon: Link2,
    fields: [
      { key: 'site.discordUrl', label: 'Discord', type: 'url' },
      { key: 'site.vkUrl', label: 'VK', type: 'url' },
      { key: 'site.youtubeUrl', label: 'YouTube', type: 'url' },
      { key: 'site.telegramUrl', label: 'Telegram', type: 'url' },
    ],
  },
  {
    key: 'maintenance',
    title: 'Режимы работы',
    Icon: Wrench,
    fields: [
      { key: 'maintenance.enabled', label: 'Технические работы', hint: 'Закрывает сайт для игроков', type: 'toggle' },
      { key: 'maintenance.message', label: 'Сообщение на время работ', type: 'textarea' },
      { key: 'registration.enabled', label: 'Регистрация открыта', type: 'toggle' },
      { key: 'races.enabled', label: 'Модуль рас включён', type: 'toggle' },
    ],
  },
];

export default function AdminSettingsPage() {
  const { toast } = useToast();
  const [form, setForm] = useState<SettingsForm>({});
  const [initial, setInitial] = useState<SettingsForm>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api
      .get<{ settings: SiteSettings }>('/admin/settings')
      .then((d) => {
        setForm(d.settings as unknown as SettingsForm);
        setInitial(d.settings as unknown as SettingsForm);
      })
      .catch((err) => toast(err instanceof ApiError ? err.message : 'Не удалось загрузить настройки', 'error'))
      .finally(() => setLoading(false));
  }, [toast]);

  const dirty = JSON.stringify(form) !== JSON.stringify(initial);

  const save = async () => {
    setSaving(true);
    try {
      const res = await api.patch<{ settings: SiteSettings }>('/admin/settings', form);
      setInitial(res.settings as unknown as SettingsForm);
      toast('Настройки сохранены. Обновите страницу, чтобы увидеть изменения в шапке.', 'success');
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Не удалось сохранить', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-neon-cyan" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 pb-20">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold text-ink">Настройки сайта</h1>
          <p className="mt-1 text-sm text-ink-muted">Глобальные переменные без правки кода</p>
        </div>
      </header>

      {GROUPS.map(({ key, title, Icon, fields }) => (
        <section key={key} className="glass p-6">
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-ink">
            <Icon className="h-4 w-4 text-neon-cyan" />
            {title}
          </h2>

          <div className="mt-5 space-y-4">
            {fields.map((field) => {
              const value = form[field.key];

              if (field.type === 'toggle') {
                const checked = Boolean(value);
                return (
                  <label
                    key={field.key}
                    className="flex cursor-pointer items-center justify-between rounded-xl border border-white/10 p-4 transition-colors hover:border-white/20"
                  >
                    <span>
                      <span className="block text-sm font-medium text-ink">{field.label}</span>
                      {field.hint && <span className="mt-0.5 block text-xs text-ink-dim">{field.hint}</span>}
                    </span>
                    <span className="relative inline-flex h-6 w-11 shrink-0 items-center">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => setForm({ ...form, [field.key]: e.target.checked })}
                        className="peer sr-only"
                      />
                      <span className={cn('absolute inset-0 rounded-full transition-colors', checked ? 'bg-neon-cyan' : 'bg-void-600')} />
                      <span className={cn('absolute left-0.5 h-5 w-5 rounded-full bg-white transition-transform', checked && 'translate-x-5')} />
                    </span>
                  </label>
                );
              }

              const id = `setting-${field.key}`;
              return (
                <div key={field.key}>
                  <label htmlFor={id} className="label">{field.label}</label>
                  {field.type === 'textarea' ? (
                    <textarea
                      id={id}
                      rows={2}
                      value={String(value ?? '')}
                      onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
                      className="input resize-none"
                    />
                  ) : (
                    <input
                      id={id}
                      type={field.type === 'url' ? 'url' : 'text'}
                      value={String(value ?? '')}
                      onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
                      className={cn('input', field.type === 'url' && 'font-mono text-xs')}
                    />
                  )}
                  {field.hint && <p className="mt-1 text-xs text-ink-dim">{field.hint}</p>}
                </div>
              );
            })}
          </div>
        </section>
      ))}

      {/* Плавающая панель сохранения */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/[0.08] bg-void-900/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <p className="text-xs text-ink-muted">
            {dirty ? 'Есть несохранённые изменения' : 'Все изменения сохранены'}
          </p>
          <button
            type="button"
            onClick={save}
            disabled={!dirty || saving}
            className="btn-primary"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Сохранить
          </button>
        </div>
      </div>
    </div>
  );
}
