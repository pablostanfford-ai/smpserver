'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, Check, Loader2 } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/components/ui/Toast';
import type { Race } from '@/lib/types';

export function ChooseRaceButton({ race }: { race: Race }) {
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [pending, setPending] = useState(false);

  const isCurrent = user?.race?.slug === race.slug;

  if (!user) {
    return (
      <a href={`/register?race=${race.slug}`} className="btn-primary shrink-0">
        <Sparkles className="h-4 w-4" />
        Выбрать расу
      </a>
    );
  }

  if (isCurrent) {
    return (
      <span className="badge shrink-0 border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-emerald-300">
        <Check className="h-4 w-4" />
        Ваша раса
      </span>
    );
  }

  const handleChoose = async () => {
    setPending(true);
    try {
      const res = await api.post<{ syncedToServer: boolean }>('/me/race', { raceSlug: race.slug });
      await refreshUser();
      toast(
        res.syncedToServer
          ? `Раса изменена на «${race.name}» и применена на сервере`
          : `Раса изменена на «${race.name}». На сервере применится при следующем входе`,
        'success',
      );
      router.refresh();
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Не удалось сменить расу', 'error');
    } finally {
      setPending(false);
    }
  };

  return (
    <button type="button" onClick={handleChoose} disabled={pending} className="btn-secondary shrink-0">
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
      {pending ? 'Применяем…' : 'Играть за эту расу'}
    </button>
  );
}
