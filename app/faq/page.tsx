import React from 'react';
import Link from 'next/link';

export const metadata = {
  title: 'FAQ - Często Zadawane Pytania | EnergyOptimizer',
  description: 'Masz pytania dotyczące taryf dynamicznych, naszego kalkulatora lub integracji z Home Assistant? Znajdź odpowiedzi tutaj.',
};

export default function FaqPage() {
  const faqs = [
    {
      question: "Czy taryfa dynamiczna opłaca się każdemu?",
      answer: "Nie. Dlatego stworzyliśmy nasz darmowy kalkulator. Jeśli zużywasz prąd głównie wieczorami (np. w szczycie między 19:00 a 21:00) i nie masz jak tego zmienić, taryfa dynamiczna może podnieść Twoje rachunki. Jeśli jednak masz pompę ciepła, bojler lub samochód elektryczny i możesz uruchamiać je w ciągu dnia (gdy prąd z giełdy jest najtańszy), oszczędności mogą sięgać nawet 30-40%."
    },
    {
      question: "Mam zwykłą taryfę G11. Czy wasze API obniży mój rachunek?",
      answer: "Nie. W taryfie G11 płacisz stałą stawkę za prąd przez całą dobę. Przesuwanie zużycia na tańsze godziny giełdowe nic nie zmieni na Twoim rachunku. Nasze API automatyzacji (wersja PRO) jest przeznaczone dla osób, które podpisały ze swoim dostawcą aneks na tzw. Taryfę Dynamiczną, w której cena prądu zmienia się co godzinę."
    },
    {
      question: "Skąd bierzecie ceny prądu i czy to te same ceny, które zapłacę?",
      answer: "Pobieramy oficjalne, darmowe dane o Rynkowej Cenie Energii (RCE) z Polskich Sieci Elektroenergetycznych (PSE). Taryfy dynamiczne u sprzedawców opierają się na bliźniaczym wskaźniku RDN z Towarowej Giełdy Energii. Chociaż wykresy RCE idealnie pokrywają się z dołkami i górkami na giełdzie (co pozwala bezbłędnie namierzyć najtańsze okna do grzania w Home Assistant), pamiętaj, że do nagiej ceny giełdowej Twój dostawca doliczy opłaty dystrybucyjne, marżę i podatek VAT."
    },
    {
      question: "Jak działa integracja z Home Assistant?",
      answer: "Po wykupieniu dostępu PRO otrzymujesz unikalny klucz API. Wystarczy skopiować kilka linijek kodu z Twojego panelu do pliku configuration.yaml w Home Assistant. Twoja centrala zacznie automatycznie pobierać informacje o aktualnych cenach oraz najtańszych blokach godzinowych na dziś i na jutro. Możesz użyć tych danych (jako encji) do tworzenia własnych automatyzacji, np.: 'Jeśli obecna godzina mieści się w najtańszym oknie, włącz pompę ciepła na 100%'."
    },
    {
      question: "Z jakich dostawców mogę wgrać plik CSV do audytu?",
      answer: "Obecnie wspieramy pliki historii zużycia z systemów eLicznik (Tauron), eBOK (PGE), eBOK (Enea) oraz Mój Licznik (Energa). Plik musi pochodzić z licznika zdalnego odczytu i zawierać dane z rozdzielczością godzinową lub 15-minutową."
    },
    {
      question: "Czy mogę anulować subskrypcję PRO?",
      answer: "Oczywiście, w każdej chwili. Płatności i subskrypcje są obsługiwane przez globalnego operatora płatności Stripe. Wystarczy kliknąć przycisk w panelu użytkownika, aby zarządzać subskrypcją lub z niej zrezygnować bez żadnych dodatkowych pytań."
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 py-16 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="mb-12 text-center">
          <Link href="/" className="text-emerald-600 font-semibold hover:text-emerald-700 transition-colors mb-6 inline-block">
            &larr; Powrót na stronę główną
          </Link>
          <h1 className="text-4xl font-black text-slate-900 mb-4">Często Zadawane Pytania</h1>
          <p className="text-slate-600">Rozwiewamy wątpliwości na temat taryf dynamicznych i naszej aplikacji.</p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <details 
              key={index} 
              className="group bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden [&_summary::-webkit-details-marker]:hidden"
            >
              <summary className="flex items-center justify-between p-6 cursor-pointer font-bold text-slate-800 hover:text-emerald-600 transition-colors">
                <span className="text-lg">{faq.question}</span>
                <span className="ml-4 flex-shrink-0 transition-transform duration-300 group-open:-rotate-180">
                  <svg className="w-6 h-6 text-slate-400 group-hover:text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </span>
              </summary>
              <div className="p-6 pt-0 text-slate-600 leading-relaxed border-t border-slate-100 mt-2">
                {faq.answer}
              </div>
            </details>
          ))}
        </div>

        <div className="mt-16 bg-emerald-50 border border-emerald-100 rounded-3xl p-8 text-center">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Nie znalazłeś odpowiedzi?</h2>
          <p className="text-slate-600 mb-6">Napisz do nas, chętnie pomożemy Ci przeanalizować Twoją sytuację.</p>
          <a href="mailto:kontakt@energyoptimizer.pl" className="inline-block bg-emerald-600 text-white font-bold py-3 px-8 rounded-xl hover:bg-emerald-700 transition-colors">
            Napisz wiadomość
          </a>
        </div>
      </div>
    </div>
  );
}