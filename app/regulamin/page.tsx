import React from 'react';
import Link from 'next/link';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

export default function TermsOfService() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 font-sans text-slate-900">
      <Navbar />
      
      <main className="flex-grow max-w-4xl mx-auto w-full py-16 px-6">
        <Link href="/" className="text-emerald-600 font-bold hover:underline mb-8 inline-block">
          &larr; Powrót na stronę główną
        </Link>
        <h1 className="text-3xl font-black mb-6">Regulamin Serwisu</h1>
        <p className="text-sm text-slate-500 mb-8">Ostatnia aktualizacja: {new Date().toLocaleDateString('pl-PL')}</p>

        <div className="space-y-6 text-slate-600 leading-relaxed bg-white p-8 md:p-12 rounded-3xl shadow-sm border border-slate-200">
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-2">1. Postanowienia ogólne</h2>
            <p>Serwis <strong>energyoptimizer.pl</strong> udostępnia narzędzia do analizy historycznego zużycia energii elektrycznej oraz śledzenia giełdowych cen prądu (RCE).</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-2">2. Usługi i Płatności</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Podstawowa analiza danych historycznych na podstawie plików CSV jest bezpłatna.</li>
              <li>Serwis oferuje płatne funkcje "PRO" (m.in. prognozy cen z PSE, dedykowane API dla Smart Home).</li>
              <li>Płatności są obsługiwane przez operatora Stripe. Wykupienie pakietu PRO aktywuje usługę od razu po przetworzeniu płatności.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-2">3. Zrzeczenie się odpowiedzialności</h2>
            <p>Aplikacja ma charakter edukacyjno-analityczny. Wszelkie wyliczenia są estymacjami opartymi na danych publicznych (PSE) i historycznych. Administrator nie ponosi odpowiedzialności za finalne rachunki wystawione przez operatorów sieci dystrybucyjnej.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-2">4. Rezygnacja i zwroty</h2>
            <p>Z uwagi na cyfrowy charakter usługi PRO (uzyskanie natychmiastowego dostępu do funkcji i danych), Użytkownik wyrażając zgodę na świadczenie usługi traci prawo do odstąpienia od umowy w terminie 14 dni, jednakże Użytkownik może anulować odnawianie subskrypcji w dowolnym momencie z poziomu swojego konta.</p>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}