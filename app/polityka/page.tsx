import React from 'react';
import Link from 'next/link';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 py-12 px-6">
      <div className="max-w-3xl mx-auto bg-white p-8 md:p-12 rounded-3xl shadow-sm border border-slate-200">
        <Link href="/" className="text-emerald-600 font-bold hover:underline mb-8 inline-block">
          &larr; Powrót na stronę główną
        </Link>
        <h1 className="text-3xl font-black mb-6">Polityka Prywatności</h1>
        <p className="text-sm text-slate-500 mb-8">Ostatnia aktualizacja: {new Date().toLocaleDateString('pl-PL')}</p>

        <div className="space-y-6 text-slate-600 leading-relaxed">
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-2">1. Postanowienia ogólne</h2>
            <p>Niniejsza Polityka Prywatności określa zasady przetwarzania i ochrony danych osobowych przekazanych przez Użytkowników w związku z korzystaniem z serwisu <strong>energyoptimizer.pl</strong>.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-2">2. Administrator Danych</h2>
            <p>Administratorem danych osobowych jest właściciel serwisu. Kontakt z administratorem jest możliwy pod adresem e-mail: <strong>kontakt@energyoptimizer.pl</strong>.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-2">3. Jakie dane przetwarzamy?</h2>
            <p>Podczas korzystania z serwisu możemy przetwarzać:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Adres e-mail oraz podstawowe dane profilowe (w przypadku logowania przez Google/Clerk).</li>
              <li>Dane historyczne zużycia energii z plików CSV (przetwarzane w celu wygenerowania analizy).</li>
              <li>Dane płatności (przetwarzane wyłącznie przez zewnętrznego i bezpiecznego operatora - Stripe).</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-2">4. Prawa Użytkownika (RODO)</h2>
            <p>Użytkownik ma pełne prawo dostępu do swoich danych, ich poprawiania, a także żądania ich usunięcia. W panelu aplikacji (zakładka "Profil Historyczny") znajduje się automatyczny przycisk "Usuń moje dane", który natychmiastowo i trwale usuwa wszelkie dane analityczne z serwerów.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-2">5. Udostępnianie danych</h2>
            <p>Dane Użytkowników nie są sprzedawane. Korzystamy z zaufanych podwykonawców niezbędnych do działania usługi (np. serwery Vercel, system autoryzacji Clerk, system płatności Stripe).</p>
          </section>
        </div>
      </div>
    </div>
  );
}