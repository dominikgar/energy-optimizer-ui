import Link from 'next/link';
import { SignUp } from '@clerk/nextjs';

export const dynamic = 'force-dynamic';

export default function SignUpPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="mx-auto flex max-w-5xl flex-col items-center">
        <Link href="/" className="mb-8 text-sm font-bold text-slate-500 hover:text-slate-900">
          ← Wróć do EnergyOptimizer
        </Link>
        <SignUp routing="hash" forceRedirectUrl="/" />
      </div>
    </main>
  );
}
