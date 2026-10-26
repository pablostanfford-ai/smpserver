import Link from 'next/link';
import { Ghost, Home, Sparkles } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center text-center">
      <Ghost className="h-14 w-14 text-ink-dim" />
      <p className="mt-6 font-display text-6xl font-bold text-gradient">404</p>
      <h1 className="mt-2 font-display text-xl font-semibold text-ink">Страница потерялась в Нижнем мире</h1>
      <p className="mt-2 text-sm text-ink-muted">
        Возможно, ссылка устарела или раса была переименована.
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Link href="/" className="btn-primary">
          <Home className="h-4 w-4" />
          На главную
        </Link>
        <Link href="/races" className="btn-secondary">
          <Sparkles className="h-4 w-4" />
          К расам
        </Link>
      </div>
    </div>
  );
}
