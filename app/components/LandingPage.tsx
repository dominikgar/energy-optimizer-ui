import React from 'react';
import Link from 'next/link';
import Footer from './Footer';

const IconZap = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500 fill-emerald-500">
    <path d="M4 14.71 13.5 3l-1.33 8.29H20l-9.5 11.71 1.33-8.29H4z" />
  </svg>
);

function FeatureCard({ icon, title, children }: { icon: string; title: string; children: React.ReactNode }) {
  return (
    <article className="group rounded-3xl border border-emerald-950/10 bg-white p-7 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-emerald-950/5">
      <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-2xl" aria-hidden="true">{icon}</div>
      <h3 className="mb-3 text-xl font-black tracking-tight text-slate-900">{title}</h3>
      <p className="leading-7 text-slate-600">{children}</p>
    </article>
  );
}

export default function LandingPage() {
  return (
    <div className="flex min-h-screen w-full flex-col overflow-x-hidden bg-[#f5f7f4] text-slate-700">
      <header className="sticky top-0 z-50 border-b border-emerald-950/10 bg-[#f5f7f4]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-2 text-xl font-black tracking-tight">
            <IconZap />
            <span className="bg-gradient-to-r from-emerald-600 to-blue-600 bg-clip-text text-transparent">EnergyOptimizer</span>
          </div>
          <Link href="/sign-in" className="rounded-full border border-emerald-950/10 bg-white px-5 py-2 text-sm font-bold text-slate-900 shadow-sm transition-colors hover:bg-emerald-50">
            Zaloguj się
          </Link>
        </div>
      </header>

      <main className="flex-1">
        <section className="relative isolate overflow-hidden px-6 py-20 md:py-28">
          <div className="absolute inset-x-0 top-0 -z-10 mx-auto h-[30rem] max-w-5xl rounded-full bg-emerald-200/35 blur-3xl" />
          <div className="mx-auto max-w-5xl text-center">
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-emerald-800/10 bg-white/80 px-4 py-2 text-sm font-bold text-emerald-800 shadow-sm">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Energia pod kontrolą, bez zgadywania
          </div>
          <h1 className="text-4xl font-black leading-[1.05] tracking-[-0.045em] text-slate-950 md:text-6xl">
            Prąd działa dla Ciebie,<br className="hidden md:block" /> kiedy znasz jego rytm.
          </h1>
          <p className="mx-auto mt-7 max-w-2xl text-lg leading-8 text-slate-600 md:text-xl">
            Zobacz, kiedy zużywasz energię, porównaj warianty taryfy i planuj elastyczne urządzenia w godzinach, które mają sens dla Twojego domu.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link href="/sign-up" className="inline-block rounded-full bg-emerald-700 px-8 py-4 text-lg font-bold text-white shadow-xl shadow-emerald-900/15 transition-all hover:-translate-y-0.5 hover:bg-emerald-800">
              Rozpocznij darmową analizę
            </Link>
            <Link href="/faq" className="inline-block px-5 py-3 text-sm font-bold text-slate-700 hover:text-emerald-800">Jak to działa →</Link>
          </div>
          <div className="mx-auto mt-14 grid max-w-3xl grid-cols-3 divide-x divide-emerald-950/10 rounded-3xl border border-emerald-950/10 bg-white/70 p-5 text-left shadow-sm backdrop-blur">
            <div className="px-4"><p className="text-2xl font-black text-slate-950">CSV</p><p className="mt-1 text-xs font-medium text-slate-500">Twoje zużycie</p></div>
            <div className="px-4"><p className="text-2xl font-black text-slate-950">RCE</p><p className="mt-1 text-xs font-medium text-slate-500">Ceny godzinowe</p></div>
            <div className="px-4"><p className="text-2xl font-black text-slate-950">HA</p><p className="mt-1 text-xs font-medium text-slate-500">Automatyzacja PRO</p></div>
          </div>
          </div>
        </section>

        <section className="border-y border-emerald-950/10 bg-white px-6 py-24">
          <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-2">
            <div>
              <p className="mb-3 text-sm font-black uppercase tracking-widest text-blue-600">Darmowy audyt historyczny</p>
              <h2 className="text-3xl font-black leading-tight text-slate-900 md:text-4xl">Najpierw poznaj swój profil, potem zmieniaj taryfę.</h2>
              <p className="mt-6 text-lg leading-8 text-slate-600">
                Aplikacja łączy dane godzinowe z cenami giełdowymi i pokazuje koszt energii czynnej w analizowanym okresie. Surowa cena RCE nie jest pełnym rachunkiem — marża sprzedawcy, podatki i opłaty dystrybucyjne muszą być uwzględnione osobno.
              </p>
              <ul className="mt-8 space-y-3 font-semibold text-slate-700">
                <li>✓ Historia zużycia na wykresie</li>
                <li>✓ Najdroższe i najtańsze godziny</li>
                <li>✓ Konfigurowalny rachunek G11 i dynamiczny</li>
                <li>✓ Możliwość trwałego usunięcia danych</li>
              </ul>
            </div>

            <div className="rounded-[32px] border border-emerald-950/10 bg-[#f5f7f4] p-7 shadow-xl shadow-emerald-950/5">
              <div className="mb-6 flex items-center justify-between">
                <span className="rounded-xl bg-blue-100 px-3 py-2 text-xs font-black uppercase text-blue-700">Przykładowa analiza</span>
                <span className="text-xs font-semibold text-slate-400">Wyniki orientacyjne</span>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-white p-5">
                  <p className="text-xs font-bold uppercase text-slate-400">Zużycie</p>
                  <p className="mt-2 text-3xl font-black text-slate-900">126 kWh</p>
                </div>
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
                  <p className="text-xs font-bold uppercase text-emerald-600">Najtańsza godzina</p>
                  <p className="mt-2 text-3xl font-black text-emerald-700">13:00</p>
                </div>
              </div>
              <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-5">
                <p className="font-black text-amber-900">Wniosek do sprawdzenia</p>
                <p className="mt-2 leading-6 text-amber-800">Duża część zużycia przypada wieczorem. Urządzenia elastyczne mogą mieć potencjał do przesunięcia na tańsze godziny.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-6 py-24">
          <div className="mx-auto mb-12 max-w-3xl text-center">
            <p className="mb-3 text-sm font-black uppercase tracking-widest text-emerald-600">Funkcje</p>
            <h2 className="text-3xl font-black text-slate-900 md:text-4xl">Od analizy do automatyzacji</h2>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <FeatureCard icon="📊" title="Profil historyczny">Import danych CSV i analiza godzin, w których zużywasz najwięcej energii.</FeatureCard>
            <FeatureCard icon="💰" title="Doradca taryfowy">Konfigurowalny model sprzedaży, dystrybucji i orientacyjnej sumy rachunku.</FeatureCard>
            <FeatureCard icon="🕒" title="Radar cenowy">Dane PSE na dziś i jutro oraz najtańsze ciągłe okno trzygodzinne w pakiecie PRO.</FeatureCard>
            <FeatureCard icon="⚡" title="Planer urządzeń">Harmonogram dla bojlera, EV lub innego odbiornika według energii, mocy i terminu zakończenia.</FeatureCard>
            <FeatureCard icon="🔌" title="Home Assistant API">Sygnał automatyzacji aktywny wyłącznie podczas aktualnego rekomendowanego okna.</FeatureCard>
          </div>
        </section>

        <section className="mx-6 mb-16 rounded-[32px] bg-emerald-950 px-6 py-16 text-center text-white md:mx-10">
          <h2 className="text-3xl font-black tracking-tight">Zacznij od własnych danych.</h2>
          <p className="mx-auto mt-4 max-w-2xl leading-7 text-emerald-100/75">Darmowa analiza pomoże ocenić potencjał. Decyzję o zmianie taryfy warto oprzeć na pełnym cenniku konkretnego sprzedawcy.</p>
          <div className="mt-8">
            <Link href="/sign-up" className="inline-block rounded-full bg-[#c8f169] px-8 py-4 font-bold text-emerald-950 transition-colors hover:bg-[#d7f88d]">
              Przejdź do analizy
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
