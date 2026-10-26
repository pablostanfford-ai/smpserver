'use client';

import { useState } from 'react';
import { User } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Скин игрока с каскадом фолбэков: основной CDN → резервный → иконка-заглушка.
 * Используется <img>, а не next/image: домены CDN могут меняться через настройки,
 * а внешняя оптимизация здесь не даёт выигрыша на изображениях 128–256 px.
 */
export function PlayerSkin({
  src,
  fallbackSrc,
  alt,
  size = 112,
  variant = 'body',
  className,
}: {
  src: string;
  fallbackSrc?: string;
  alt: string;
  size?: number;
  variant?: 'head' | 'body';
  className?: string;
}) {
  const [stage, setStage] = useState<'primary' | 'fallback' | 'none'>('primary');
  const [current, setCurrent] = useState(src);

  const handleError = () => {
    if (stage === 'primary' && fallbackSrc) {
      setStage('fallback');
      setCurrent(fallbackSrc);
      return;
    }
    setStage('none');
  };

  return (
    <div
      className={cn(
        'relative shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-void-800',
        className,
      )}
      style={{ width: size, height: size }}
    >
      {stage === 'none' ? (
        <div className="grid h-full w-full place-items-center text-ink-dim">
          <User className="h-1/3 w-1/3" />
        </div>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={current}
          alt={alt}
          width={size}
          height={size}
          loading="lazy"
          decoding="async"
          onError={handleError}
          className={cn(
            'h-full w-full',
            variant === 'body' ? 'object-contain p-1' : 'object-cover',
          )}
        />
      )}
    </div>
  );
}
