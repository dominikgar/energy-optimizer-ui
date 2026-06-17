import React from 'react';
import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-white border-t border-slate-200 py-8 px-6 mt-auto w-full">
      <div className="max-w-7xl mx-auto flex flex-wrap justify-between items-center gap-4">
        <div className="text-slate-500 text-sm">
          © {new Date().getFullYear()} EnergyOptimizer. Wszelkie prawa zastrzeżone.
        </div>
        <div className="flex flex-wrap gap-6 text-sm font-medium">
          <Link href="/faq" className="text-slate-600 hover:text-emerald-600 transition-colors">
            FAQ
          </Link>
          <Link href="/regulamin" className="text-slate-600 hover:text-emerald-600 transition-colors">
            Regulamin
          </Link>
          <Link href="/polityka" className="text-slate-600 hover:text-emerald-600 transition-colors">
            Polityka Prywatności
          </Link>
          <a href="mailto:kontakt@energyoptimizer.pl" className="text-slate-600 hover:text-emerald-600 transition-colors">
            Kontakt
          </a>
        </div>
      </div>
    </footer>
  );
}
