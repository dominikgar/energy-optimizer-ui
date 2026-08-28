import React from 'react';
import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="mt-auto w-full border-t border-emerald-950/10 bg-[#f5f7f4] px-6 py-10">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-bold tracking-tight text-slate-800">EnergyOptimizer</p>
          <p className="mt-1 text-sm text-slate-500">© {new Date().getFullYear()} · Dane pomagają podejmować lepsze decyzje.</p>
        </div>
        <div className="flex flex-wrap gap-x-5 gap-y-3 text-sm font-medium">
          <Link href="/savings" className="text-slate-600 transition-colors hover:text-emerald-700">
            Oszczędności
          </Link>
          <Link href="/dashboardy" className="text-slate-600 transition-colors hover:text-emerald-700">
            Jak działają dashboardy
          </Link>
          <Link href="/faq" className="text-slate-600 transition-colors hover:text-emerald-700">
            FAQ
          </Link>
          <Link href="/regulamin" className="text-slate-600 transition-colors hover:text-emerald-700">
            Regulamin
          </Link>
          <Link href="/polityka" className="text-slate-600 transition-colors hover:text-emerald-700">
            Polityka Prywatności
          </Link>
          <a href="mailto:kontakt@energyoptimizer.pl" className="text-slate-600 transition-colors hover:text-emerald-700">
            Kontakt
          </a>
        </div>
      </div>
    </footer>
  );
}
