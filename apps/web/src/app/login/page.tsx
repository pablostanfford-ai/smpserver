import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import { LoginForm } from './LoginForm';

// useSearchParams() требует Suspense-границы при статической генерации,
// иначе next build падает на этапе prerender.
export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="h-7 w-7 animate-spin text-neon-cyan" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
