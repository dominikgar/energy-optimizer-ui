import React from 'react';
import { SignInButton } from '@clerk/nextjs';
import Footer from './Footer';

const IconZap = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500 fill-emerald-500">
    <path d="M4 14.71 13.5 3l-1.33 8.29H20l-9.5 11.71 1.33-8.29H4z" />
  </svg>
);

function FeatureCard({ icon, title, children }: { icon: string; title: string; children: React.ReactNode }) {
  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
      <div className="mb-4 text-3xl" aria-hidden="true">{icon}</div>
      <h3 className="mb-3 text-xl font-black text-slate-900">{title}</h3>
      <p className="leading-7 text-slate-600">{children}</p>
    </article>
  );
}

export default function LandingPage() {
  return (
    <div className="flex min-h-screen w-full flex-col overflow-x-hidden bg-slate-50 text-slate-700">
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-2 text-xl font-black tracking-tight">
            <IconZap />
            <span className="bg-gradient-to-r from-emerald-600 to-blue-600 bg-clip-text text-transparent">EnergyOptimizer</span>
          </div>
          <SignInButton mode="modal">
            <button className="rounded-full border border-slate-200 bg-white px-5 py-2 text-sm font-bold text-slate-900 shadow-sm transition-colors hover:bg-slate-50">
              Zaloguj się
            </button>
          </SignInButton>
        </div>
      </header>

      <main className="flex-1">
        <section className="mx-auto max-w-5xl px-6 py-20 text-center md:py-28">
          <div className="mb-8 inline-flex rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-bold text-blue-700">
            Analiza, kalkulacja i planowanie zużycia
          </div>
          <h1 className="bg-gradient-to-r from-emerald-600 to-blue-600 bg-clip-text text-4xl font-black leading-tight tracking-tight text-transparent md:text-6xl">
            Sprawdź taryfę i zaplanuj urządzenia na najtańsze godziny.
          </h1>
          <p className="mx-auto mt-7 max-w-3xl text-lg leading-8 text-slate-600 md:text-xl">
            Wgraj historię godzinowego zużycia, porównaj ją z cenami RCE, skonfiguruj ofertę sprzedawcy i wyznacz harmonogram dla bojlera lub ładowania EV. Wynik zależy od Twoich danych i warunków konkretnej oferty.
          </p>
          <div className="mt-10">
            <SignInButton mode="modal">
              <button className="rounded-full bg-emerald-500 px-9 py-4 text-lg font-bold text-white shadow-xl shadow-emerald-500/25 transition-all hover:bg-emerald-600 hover:-translate-y-0.5">
                Rozpocznij darmową analizę
              </button>
            </SignInButton>
          </div>
        </section>

        <section className="border-y border-slate-200 bg-white px-6 py-20">
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

            <div className="rounded-[32px] border border-slate-200 bg-slate-50 p-7 shadow-xl shadow-slate-200/50">
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

        <section className="mx-auto max-w-7xl px-6 py-20">
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

        <section className="border-t border-slate-200 bg-slate-900 px-6 py-16 text-center text-white">
          <h2 className="text-3xl font-black">Zacznij od własnych danych.</h2>
          <p className="mx-auto mt-4 max-w-2xl leading-7 text-slate-300">Darmowa analiza pomoże ocenić potencjał. Decyzję o zmianie taryfy warto oprzeć na pełnym cenniku konkretnego sprzedawcy.</p>
          <div className="mt-8">
            <SignInButton mode="modal">
              <button className="rounded-full bg-emerald-500 px-8 py-4 font-bold text-white transition-colors hover:bg-emerald-600">Przejdź do analizy</button>
            </SignInButton>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
