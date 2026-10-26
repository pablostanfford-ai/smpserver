import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import { RegisterForm } from './RegisterForm';

// useSearchParams() требует Suspense-границы при статической генерации.
export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="h-7 w-7 animate-spin text-neon-cyan" />
        </div>
      }
    >
      <RegisterForm />
    </Suspense>
  );
}
