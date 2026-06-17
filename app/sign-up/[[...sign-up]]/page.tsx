import Link from 'next/link';
import { SignUp } from '@clerk/nextjs';

export const dynamic = 'force-dynamic';

export default function SignUpPage() {
  const hasPublishableKey = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);
  const hasSecretKey = Boolean(process.env.CLERK_SECRET_KEY);

  if (!hasPublishableKey || !hasSecretKey) {
    return (
      <main className="min-h-screen bg-slate-50 px-6 py-10">
        <div className="mx-auto max-w-xl rounded-3xl border border-amber-200 bg-amber-50 p-8 shadow-sm">
          <Link href="/" className="mb-6 inline-block text-sm font-bold text-slate-500 hover:text-slate-900">
            ← Wróć do EnergyOptimizer
          </Link>
          <h1 className="text-2xl font-black text-amber-950">Rejestracja nie jest skonfigurowana dla tego wdrożenia</h1>
          <p className="mt-4 leading-7 text-amber-900">
            Środowisko Vercel Preview nie ma kompletu wymaganych zmiennych Clerk. Dodaj je dla środowiska Preview i uruchom ponowny deployment.
          </p>
          <div className="mt-6 space-y-3 rounded-2xl border border-amber-200 bg-white p-5 text-sm">
            <div className="flex items-center justify-between gap-4">
              <code>NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY</code>
              <strong className={hasPublishableKey ? 'text-emerald-600' : 'text-red-600'}>{hasPublishableKey ? 'OK' : 'BRAK'}</strong>
            </div>
            <div className="flex items-center justify-between gap-4">
              <code>CLERK_SECRET_KEY</code>
              <strong className={hasSecretKey ? 'text-emerald-600' : 'text-red-600'}>{hasSecretKey ? 'OK' : 'BRAK'}</strong>
            </div>
          </div>
          <p className="mt-6 text-sm leading-6 text-amber-800">
            Vercel: Project → Settings → Environment Variables → zaznacz Preview → Save → Redeploy.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="mx-auto flex max-w-5xl flex-col items-center">
        <Link href="/" className="mb-8 text-sm font-bold text-slate-500 hover:text-slate-900">
          ← Wróć do EnergyOptimizer
        </Link>
        <SignUp
          routing="path"
          path="/sign-up"
          signInUrl="/sign-in"
          fallbackRedirectUrl="/"
        />
      </div>
    </main>
  );
}
