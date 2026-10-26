'use client';

import { useEffect, useState } from 'react';
import { Check, Loader2, AlertCircle, Search } from 'lucide-react';
import { PlayerSkin } from '@/components/ui/PlayerSkin';
import { api, ApiError } from '@/lib/api';
import type { SkinUrls } from '@/lib/types';
import { cn } from '@/lib/utils';

interface CheckResult {
  found: boolean;
  mcName: string;
  profile?: { uuid: string; name: string; skins: SkinUrls };
}

/**
 * Поле ника Minecraft с проверкой через Mojang API.
 * Debounce 500 мс, отмена по таймауту, защита от гонки ответов.
 */
export function McNameField({
  value,
  onChange,
  onValidChange,
}: {
  value: string;
  onChange: (v: string) => void;
  onValidChange: (valid: boolean) => void;
}) {
  const [status, setStatus] = useState<'idle' | 'checking' | 'found' | 'notfound' | 'error'>('idle');
  const [profile, setProfile] = useState<CheckResult['profile'] | null>(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    onValidChange(status === 'found');
  }, [status, onValidChange]);

  useEffect(() => {
    if (!/^[A-Za-z0-9_]{3,16}$/.test(value)) {
      setStatus('idle');
      setProfile(null);
      setMessage('');
      return;
    }

    let cancelled = false;
    setStatus('checking');

    const timer = setTimeout(async () => {
      try {
        const res = await api.post<CheckResult>('/mc/check', { mcName: value });
        if (cancelled) return;

        if (res.found && res.profile) {
          setStatus('found');
          setProfile(res.profile);
          setMessage(`Аккаунт найден: ${res.profile.name}`);
        } else {
          setStatus('notfound');
          setProfile(null);
          setMessage('Аккаунт Minecraft с таким ником не найден');
        }
      } catch (err) {
        if (cancelled) return;
        setStatus('error');
        setProfile(null);
        setMessage(err instanceof ApiError ? err.message : 'Не удалось проверить ник');
      }
    }, 500);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [value]);

  return (
    <div>
      <label htmlFor="mcName" className="label">Ник в Minecraft</label>
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <input
            id="mcName"
            type="text"
            required
            maxLength={16}
            value={value}
            onChange={(e) => onChange(e.target.value.replace(/[^A-Za-z0-9_]/g, ''))}
            className={cn(
              'input pr-10',
              status === 'found' && 'border-emerald-500/50 focus:border-emerald-500/70',
              (status === 'notfound' || status === 'error') && 'border-rose-500/50',
            )}
            placeholder="Notch"
            autoComplete="off"
            spellCheck={false}
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2">
            {status === 'checking' && <Loader2 className="h-4 w-4 animate-spin text-ink-dim" />}
            {status === 'found' && <Check className="h-4 w-4 text-emerald-400" />}
            {(status === 'notfound' || status === 'error') && <AlertCircle className="h-4 w-4 text-rose-400" />}
            {status === 'idle' && <Search className="h-4 w-4 text-ink-dim" />}
          </span>
        </div>

        {profile && (
          <PlayerSkin
            src={profile.skins.head}
            fallbackSrc={profile.skins.headFallback}
            alt={profile.name}
            size={44}
            variant="head"
            className="!rounded-lg"
          />
        )}
      </div>

      {message && (
        <p
          className={cn(
            'mt-1.5 text-xs',
            status === 'found' ? 'text-emerald-400' : status === 'checking' ? 'text-ink-dim' : 'text-rose-300',
          )}
        >
          {message}
        </p>
      )}
      <p className="mt-1.5 text-xs text-ink-dim">
        Ник должен существовать в лицензионном Minecraft — мы проверяем его через Mojang API.
      </p>
    </div>
  );
}
