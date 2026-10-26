'use client';

import { useState } from 'react';
import { X, Loader2, Save, Plus, Trash2, Sparkles } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import { RaceIcon, ICON_NAMES } from '@/components/ui/RaceIcon';
import { cn } from '@/lib/utils';
import type { Race, RaceAbility } from '@/lib/types';

type Tab = 'basic' | 'stats' | 'abilities' | 'publish';

const STAT_KEYS = [
  { key: 'health', label: 'Здоровье' },
  { key: 'speed', label: 'Скорость' },
  { key: 'damage', label: 'Урон' },
  { key: 'defense', label: 'Защита' },
  { key: 'mana', label: 'Мана' },
  { key: 'mining', label: 'Добыча' },
] as const;

const emptyAbility = (): RaceAbility => ({ name: '', description: '', cooldown: '', key: '' });

interface FormState {
  name: string;
  slug: string;
  tagline: string;
  description: string;
  lore: string;
  icon: string;
  bannerUrl: string;
  color: string;
  accentColor: string;
  difficulty: number;
  stats: Record<string, number>;
  passives: RaceAbility[];
  actives: RaceAbility[];
  strengths: string[];
  weaknesses: string[];
  playstyle: string;
  recommended: string;
  isActive: boolean;
  isSelectable: boolean;
  sortOrder: number;
}

function toForm(race: Race | null): FormState {
  return {
    name: race?.name ?? '',
    slug: race?.slug ?? '',
    tagline: race?.tagline ?? '',
    description: race?.description ?? '',
    lore: race?.lore ?? '',
    icon: race?.icon ?? 'Sparkles',
    bannerUrl: race?.bannerUrl ?? '',
    color: race?.color ?? '#22d3ee',
    accentColor: race?.accentColor ?? '#a855f7',
    difficulty: race?.difficulty ?? 2,
    stats: race?.stats ?? { health: 0, speed: 0, damage: 0, defense: 0, mana: 0 },
    passives: race?.passives ?? [],
    actives: race?.actives ?? [],
    strengths: race?.strengths ?? [],
    weaknesses: race?.weaknesses ?? [],
    playstyle: race?.playstyle ?? '',
    recommended: race?.recommended ?? '',
    isActive: race?.isActive ?? true,
    isSelectable: race?.isSelectable ?? true,
    sortOrder: race?.sortOrder ?? 0,
  };
}

export function RaceEditorDialog({
  race,
  onClose,
  onSaved,
}: {
  race: Race | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [tab, setTab] = useState<Tab>('basic');
  const [form, setForm] = useState<FormState>(() => toForm(race));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const submit = async () => {
    setError(null);
    setPending(true);

    const payload = {
      ...form,
      slug: form.slug || undefined,
      bannerUrl: form.bannerUrl || null,
      passives: form.passives
        .filter((a) => a.name.trim() && a.description.trim())
        .map((a) => ({
          name: a.name,
          description: a.description,
          ...(a.cooldown ? { cooldown: a.cooldown } : {}),
          ...(a.key ? { key: a.key } : {}),
        })),
      actives: form.actives
        .filter((a) => a.name.trim() && a.description.trim())
        .map((a) => ({
          name: a.name,
          description: a.description,
          ...(a.cooldown ? { cooldown: a.cooldown } : {}),
          ...(a.key ? { key: a.key } : {}),
        })),
      strengths: form.strengths.filter(Boolean),
      weaknesses: form.weaknesses.filter(Boolean),
    };

    try {
      if (race) {
        await api.patch(`/admin/races/${race.id}`, payload);
        toast(`Раса «${form.name}» обновлена`, 'success');
      } else {
        await api.post('/admin/races', payload);
        toast(`Раса «${form.name}» создана`, 'success');
      }
      onSaved();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(
          err.details
            ? Object.values(err.details).flat().join(' · ')
            : err.message,
        );
      } else {
        setError('Не удалось сохранить расу');
      }
    } finally {
      setPending(false);
    }
  };

  const TABS: Array<{ key: Tab; label: string }> = [
    { key: 'basic', label: 'Основное' },
    { key: 'stats', label: 'Статы' },
    { key: 'abilities', label: 'Способности' },
    { key: 'publish', label: 'Публикация' },
  ];

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-void-950/85 p-3 backdrop-blur-sm sm:items-center sm:p-6">
      <button type="button" className="absolute inset-0 cursor-default" onClick={onClose} aria-label="Закрыть" />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="race-editor-title"
        className="glass relative flex max-h-[92vh] w-full max-w-3xl flex-col animate-fade-up"
      >
        <div className="flex items-center justify-between border-b border-white/[0.07] p-5">
          <div className="flex items-center gap-3">
            <span
              className="grid h-10 w-10 place-items-center rounded-xl"
              style={{ background: `${form.color}1a`, color: form.color }}
            >
              <RaceIcon name={form.icon} className="h-5 w-5" />
            </span>
            <div>
              <h2 id="race-editor-title" className="font-display text-lg font-bold text-ink">
                {race ? `Редактирование: ${race.name}` : 'Новая раса'}
              </h2>
              <p className="text-xs text-ink-dim">Изменения сразу видны на сайте</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="btn-ghost !p-2" aria-label="Закрыть">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex gap-1 overflow-x-auto border-b border-white/[0.07] px-3 pt-2">
          {TABS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={cn(
                'shrink-0 rounded-t-lg px-3.5 py-2 text-xs font-medium transition-colors',
                tab === key ? 'border-b-2 border-neon-cyan text-neon-cyan' : 'text-ink-dim hover:text-ink',
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {/* ── Основное ── */}
          {tab === 'basic' && (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="race-name" className="label">Название *</label>
                  <input
                    id="race-name"
                    value={form.name}
                    onChange={(e) => set('name', e.target.value)}
                    className="input"
                    placeholder="Например: Драконорождённый"
                  />
                </div>
                <div>
                  <label htmlFor="race-slug" className="label">Slug (URL)</label>
                  <input
                    id="race-slug"
                    value={form.slug}
                    onChange={(e) => set('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                    className="input font-mono"
                    placeholder="авто из названия"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="race-tagline" className="label">Короткий слоган</label>
                <input
                  id="race-tagline"
                  value={form.tagline}
                  onChange={(e) => set('tagline', e.target.value)}
                  className="input"
                  placeholder="Одна строка, которая продаёт расу"
                  maxLength={120}
                />
              </div>

              <div>
                <label htmlFor="race-description" className="label">Описание *</label>
                <textarea
                  id="race-description"
                  value={form.description}
                  onChange={(e) => set('description', e.target.value)}
                  rows={4}
                  className="input resize-none"
                  placeholder="Геймплейное описание расы"
                />
              </div>

              <div>
                <label htmlFor="race-lore" className="label">Лор</label>
                <textarea
                  id="race-lore"
                  value={form.lore}
                  onChange={(e) => set('lore', e.target.value)}
                  rows={5}
                  className="input resize-none"
                  placeholder="История расы в мире сервера"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="race-playstyle" className="label">Стиль игры</label>
                  <input
                    id="race-playstyle"
                    value={form.playstyle}
                    onChange={(e) => set('playstyle', e.target.value)}
                    className="input"
                    placeholder="Танк / Дальний бой / Маг"
                  />
                </div>
                <div>
                  <label htmlFor="race-recommended" className="label">Кому подойдёт</label>
                  <input
                    id="race-recommended"
                    value={form.recommended}
                    onChange={(e) => set('recommended', e.target.value)}
                    className="input"
                    placeholder="Новичкам, любителям PvP…"
                  />
                </div>
              </div>

              <div>
                <span className="label">Иконка (Lucide)</span>
                <div className="flex flex-wrap gap-2">
                  {ICON_NAMES.map((name) => (
                    <button
                      key={name}
                      type="button"
                      onClick={() => set('icon', name)}
                      title={name}
                      className={cn(
                        'grid h-10 w-10 place-items-center rounded-lg border transition-colors',
                        form.icon === name
                          ? 'border-neon-cyan/60 bg-neon-cyan/10 text-neon-cyan'
                          : 'border-white/10 text-ink-muted hover:border-white/25 hover:text-ink',
                      )}
                    >
                      <RaceIcon name={name} className="h-4 w-4" />
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="race-color" className="label">Основной цвет</label>
                  <div className="flex items-center gap-2">
                    <input
                      id="race-color"
                      type="color"
                      value={form.color}
                      onChange={(e) => set('color', e.target.value)}
                      className="h-10 w-14 cursor-pointer rounded-lg border border-white/10 bg-transparent"
                    />
                    <input
                      value={form.color}
                      onChange={(e) => set('color', e.target.value)}
                      className="input font-mono text-xs"
                      maxLength={7}
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="race-accent" className="label">Акцентный цвет</label>
                  <div className="flex items-center gap-2">
                    <input
                      id="race-accent"
                      type="color"
                      value={form.accentColor}
                      onChange={(e) => set('accentColor', e.target.value)}
                      className="h-10 w-14 cursor-pointer rounded-lg border border-white/10 bg-transparent"
                    />
                    <input
                      value={form.accentColor}
                      onChange={(e) => set('accentColor', e.target.value)}
                      className="input font-mono text-xs"
                      maxLength={7}
                    />
                  </div>
                </div>
              </div>

              <div>
                <label htmlFor="race-banner" className="label">URL баннера</label>
                <input
                  id="race-banner"
                  type="url"
                  value={form.bannerUrl}
                  onChange={(e) => set('bannerUrl', e.target.value)}
                  className="input font-mono text-xs"
                  placeholder="https://cdn.example.com/banner.webp"
                />
              </div>
            </div>
          )}

          {/* ── Статы ── */}
          {tab === 'stats' && (
            <div className="space-y-5">
              <p className="text-xs leading-relaxed text-ink-dim">
                Значения от −6 до +6 — это отклонение от базы. Они рисуются на радаре характеристик
                и в полосах на странице расы.
              </p>

              <div>
                <span className="label">Сложность (1–5)</span>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => set('difficulty', n)}
                      className={cn(
                        'h-10 flex-1 rounded-lg border text-sm font-medium transition-colors',
                        form.difficulty >= n
                          ? 'border-transparent text-void-950'
                          : 'border-white/10 text-ink-dim hover:border-white/25',
                      )}
                      style={form.difficulty >= n ? { background: form.color } : undefined}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                {STAT_KEYS.map(({ key, label }) => (
                  <div key={key} className="flex items-center gap-3">
                    <span className="w-24 shrink-0 text-sm text-ink-muted">{label}</span>
                    <input
                      type="range"
                      min={-6}
                      max={6}
                      step={1}
                      value={form.stats[key] ?? 0}
                      onChange={(e) =>
                        set('stats', { ...form.stats, [key]: Number(e.target.value) })
                      }
                      className="flex-1 accent-neon-cyan"
                      aria-label={label}
                    />
                    <span className="w-10 shrink-0 text-right font-mono text-sm text-ink">
                      {(form.stats[key] ?? 0) > 0 ? `+${form.stats[key]}` : (form.stats[key] ?? 0)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="divider" />

              <div className="grid gap-4 sm:grid-cols-2">
                <StringListEditor
                  title="Сильные стороны"
                  items={form.strengths}
                  onChange={(v) => set('strengths', v)}
                  placeholder="Лучший дальний бой"
                />
                <StringListEditor
                  title="Слабые стороны"
                  items={form.weaknesses}
                  onChange={(v) => set('weaknesses', v)}
                  placeholder="Мало здоровья"
                />
              </div>
            </div>
          )}

          {/* ── Способности ── */}
          {tab === 'abilities' && (
            <div className="space-y-6">
              <AbilityEditor
                title="Пассивные способности"
                hint="Работают постоянно"
                items={form.passives}
                onChange={(v) => set('passives', v)}
                showCooldown={false}
              />
              <div className="divider" />
              <AbilityEditor
                title="Активные способности"
                hint="Требуют активации"
                items={form.actives}
                onChange={(v) => set('actives', v)}
                showCooldown
              />
            </div>
          )}

          {/* ── Публикация ── */}
          {tab === 'publish' && (
            <div className="space-y-4">
              <ToggleRow
                title="Показывать на сайте"
                description="Раса видна в каталоге и доступна по прямой ссылке"
                checked={form.isActive}
                onChange={(v) => set('isActive', v)}
              />
              <ToggleRow
                title="Доступна для выбора игрокам"
                description="Можно выбрать при регистрации и сменить в кабинете"
                checked={form.isSelectable}
                onChange={(v) => set('isSelectable', v)}
              />

              <div>
                <label htmlFor="race-sort" className="label">Порядок сортировки</label>
                <input
                  id="race-sort"
                  type="number"
                  min={0}
                  max={999}
                  value={form.sortOrder}
                  onChange={(e) => set('sortOrder', Number(e.target.value))}
                  className="input w-32"
                />
                <p className="mt-1.5 text-xs text-ink-dim">Меньшее число — выше в списке</p>
              </div>

              <div className="glass !bg-void-900/50 p-4">
                <p className="flex items-center gap-2 text-xs text-ink-muted">
                  <Sparkles className="h-3.5 w-3.5 text-neon-cyan" />
                  Предпросмотр
                </p>
                <div className="mt-3 flex items-center gap-3">
                  <span
                    className="grid h-11 w-11 place-items-center rounded-xl"
                    style={{ background: `${form.color}1a`, color: form.color }}
                  >
                    <RaceIcon name={form.icon} className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-ink">{form.name || 'Название расы'}</p>
                    <p className="truncate text-xs text-ink-dim">{form.tagline || 'Слоган'}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="border-t border-rose-500/20 bg-rose-500/10 px-5 py-3 text-sm text-rose-200">
            {error}
          </div>
        )}

        <div className="flex gap-3 border-t border-white/[0.07] p-4">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">
            Отмена
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={pending || !form.name || form.description.length < 10}
            className="btn-primary flex-1"
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {race ? 'Сохранить' : 'Создать расу'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  Вспомогательные редакторы
// ─────────────────────────────────────────────────────────────

function StringListEditor({
  title,
  items,
  onChange,
  placeholder,
}: {
  title: string;
  items: string[];
  onChange: (v: string[]) => void;
  placeholder: string;
}) {
  return (
    <div>
      <span className="label">{title}</span>
      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="flex gap-2">
            <input
              value={item}
              onChange={(e) => onChange(items.map((x, idx) => (idx === i ? e.target.value : x)))}
              className="input text-sm"
              placeholder={placeholder}
            />
            <button
              type="button"
              onClick={() => onChange(items.filter((_, idx) => idx !== i))}
              className="btn-ghost !px-2.5 shrink-0"
              aria-label="Удалить"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => onChange([...items, ''])}
          className="btn-ghost w-full !py-1.5 text-xs"
        >
          <Plus className="h-3.5 w-3.5" />
          Добавить
        </button>
      </div>
    </div>
  );
}

function AbilityEditor({
  title,
  hint,
  items,
  onChange,
  showCooldown,
}: {
  title: string;
  hint: string;
  items: RaceAbility[];
  onChange: (v: RaceAbility[]) => void;
  showCooldown: boolean;
}) {
  const update = (index: number, patch: Partial<RaceAbility>) =>
    onChange(items.map((item, i) => (i === index ? { ...item, ...patch } : item)));

  return (
    <div>
      <div className="mb-3 flex items-baseline justify-between">
        <h3 className="text-sm font-semibold text-ink">{title}</h3>
        <span className="text-xs text-ink-dim">{hint}</span>
      </div>

      <div className="space-y-3">
        {items.map((ability, i) => (
          <div key={i} className="rounded-xl border border-white/[0.08] bg-void-900/40 p-3.5">
            <div className="flex gap-2">
              <input
                value={ability.name}
                onChange={(e) => update(i, { name: e.target.value })}
                className="input text-sm"
                placeholder="Название способности"
              />
              <button
                type="button"
                onClick={() => onChange(items.filter((_, idx) => idx !== i))}
                className="btn-ghost !px-2.5 shrink-0 hover:!text-rose-300"
                aria-label="Удалить способность"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>

            <textarea
              value={ability.description}
              onChange={(e) => update(i, { description: e.target.value })}
              rows={2}
              className="input mt-2 resize-none text-sm"
              placeholder="Что именно делает способность"
            />

            <div className="mt-2 flex gap-2">
              {showCooldown && (
                <input
                  value={ability.cooldown ?? ''}
                  onChange={(e) => update(i, { cooldown: e.target.value })}
                  className="input text-xs"
                  placeholder="КД: 60 сек"
                />
              )}
              <input
                value={ability.key ?? ''}
                onChange={(e) => update(i, { key: e.target.value.toUpperCase().slice(0, 3) })}
                className="input w-24 shrink-0 text-center font-mono text-xs"
                placeholder="R"
                maxLength={3}
                aria-label="Клавиша"
              />
            </div>
          </div>
        ))}

        <button
          type="button"
          onClick={() => onChange([...items, emptyAbility()])}
          className="btn-secondary w-full !py-2 text-xs"
        >
          <Plus className="h-3.5 w-3.5" />
          Добавить способность
        </button>
      </div>
    </div>
  );
}

function ToggleRow({
  title,
  description,
  checked,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between rounded-xl border border-white/10 p-4 transition-colors hover:border-white/20">
      <span>
        <span className="block text-sm font-medium text-ink">{title}</span>
        <span className="mt-0.5 block text-xs text-ink-dim">{description}</span>
      </span>
      <span className="relative inline-flex h-6 w-11 shrink-0 items-center">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="peer sr-only"
        />
        <span
          className={cn(
            'absolute inset-0 rounded-full transition-colors',
            checked ? 'bg-neon-cyan' : 'bg-void-600',
          )}
        />
        <span
          className={cn(
            'absolute left-0.5 h-5 w-5 rounded-full bg-white transition-transform',
            checked && 'translate-x-5',
          )}
        />
      </span>
    </label>
  );
}
