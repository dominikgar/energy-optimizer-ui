import React from 'react';
import { SignInButton } from '@clerk/nextjs';

const IconZap = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500 fill-emerald-500"><path d="M4 14.71 13.5 3l-1.33 8.29H20l-9.5 11.71 1.33-8.29H4z"/></svg>
);

export default function LandingPage() {
  return (
    <div style={{ backgroundColor: '#f8fafc', minHeight: '100vh', width: '100%' }}>
      <header className="app-wrapper" style={{ paddingBottom: '0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ fontSize: '1.4rem', fontWeight: '900', background: 'linear-gradient(to right, #059669, #2563eb)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '-0.5px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <IconZap /> Energy Optimizer
        </div>
        <SignInButton mode="modal">
          <button style={{ padding: '8px 20px', backgroundColor: '#fff', color: '#0f172a', border: '1px solid #cbd5e1', borderRadius: '20px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.9rem' }}>
            Zaloguj się
          </button>
        </SignInButton>
      </header>

      <main style={{ padding: '0', fontFamily: 'system-ui, sans-serif', color: '#334155' }}>
        {/* HERO SECTION */}
        <div className="app-wrapper" style={{ padding: '4rem 2rem 6rem', textAlign: 'center', maxWidth: '900px', margin: '0 auto' }}>
          <div style={{ display: 'inline-block', padding: '6px 16px', backgroundColor: '#eff6ff', color: '#1d4ed8', borderRadius: '20px', fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '2rem', border: '1px solid #bfdbfe' }}>
            Standard 2026: Gotowi na Taryfy Dynamiczne
          </div>
          <h1 className="hero-title" style={{ marginBottom: '1.5rem', background: 'linear-gradient(to right, #059669, #2563eb)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontWeight: '900', lineHeight: '1.1', letterSpacing: '-1px' }}>
            Zoptymalizuj rachunki o 15-20% bez utraty komfortu.
          </h1>
          <p style={{ color: '#64748b', fontSize: '1.2rem', marginBottom: '3rem', lineHeight: '1.6', maxWidth: '700px', margin: '0 auto' }}>
            Od 2026 taryfy dynamiczne będą standardem. Sprawdź już dziś, czy Twój profil zużycia pozwoli Ci zarabiać na ujemnych cenach prądu i unikaj najdroższych godzin dzięki analizie AI.
          </p>
          <SignInButton mode="modal">
            <button style={{ padding: '16px 40px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '30px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1.2rem', boxShadow: '0 10px 25px rgba(16, 185, 129, 0.3)' }}>
              Zacznij darmowy audyt taryfowy
            </button>
          </SignInButton>
        </div>

        {/* FREE AUDIT SECTION */}
        <div style={{ backgroundColor: '#ffffff', padding: '5rem 0', borderTop: '1px solid #e2e8f0' }}>
          <div className="app-wrapper mobile-flex-wrap" style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', gap: '3rem', alignItems: 'center', flexDirection: 'row-reverse' }}>
            <div style={{ flex: '1 1 300px' }}>
              <h2 style={{ fontSize: '2.5rem', color: '#0f172a', fontWeight: 'bold', marginBottom: '1.5rem', lineHeight: '1.2' }}>
                Zacznij od <span style={{ color: '#3b82f6' }}>darmowego</span> audytu
              </h2>
              <p style={{ color: '#475569', fontSize: '1.1rem', lineHeight: '1.7', marginBottom: '1.5rem' }}>
                Nie musisz nic płacić, by zyskać cenną wiedzę. Obsługujemy pliki CSV z systemów <strong>Tauron, PGE, Enea oraz Energa</strong>.
              </p>
              <p style={{ color: '#475569', fontSize: '1.1rem', lineHeight: '1.7', marginBottom: '2rem' }}>
                Nasz system połączy Twoje dane ze stawkami giełdowymi RCE. Błyskawicznie dowiesz się, ile dokładnie kosztowałby Cię prąd w modelu dynamicznym.
              </p>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                <li style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px', fontWeight: '500' }}><span style={{ color: '#10b981' }}>✓</span> Pełna analiza taryfowa wstecz</li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px', fontWeight: '500' }}><span style={{ color: '#10b981' }}>✓</span> Wsparcie wszystkich operatorów w Polsce</li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '10px', fontWeight: '500' }}><span style={{ color: '#10b981' }}>✓</span> Porównanie z Twoją obecną stawką G11</li>
              </ul>
            </div>
            <div className="mobile-card-padding" style={{ flex: '1 1 300px', backgroundColor: '#f8fafc', padding: '2rem', borderRadius: '24px', border: '1px solid #e2e8f0', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                  <span style={{ backgroundColor: '#e0f2fe', color: '#0369a1', padding: '6px 12px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 'bold' }}>Profil Historyczny</span>
               </div>
               <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
                  <div style={{ flex: '1', padding: '1.2rem', backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                     <p style={{ margin: '0 0 5px', fontSize: '0.75rem', color: '#64748b', fontWeight: 'bold' }}>TARYFA G11</p>
                     <p style={{ margin: 0, fontSize: '1.8rem', fontWeight: '900' }}>142.50 zł</p>
                  </div>
                  <div style={{ flex: '1', padding: '1.2rem', backgroundColor: '#dcfce7', borderRadius: '16px', border: '1px solid #a7f3d0' }}>
                     <p style={{ margin: '0 0 5px', fontSize: '0.75rem', color: '#059669', fontWeight: 'bold' }}>RYNEK RCE</p>
                     <p style={{ margin: 0, fontSize: '1.8rem', fontWeight: '900', color: '#047857' }}>126.12 zł</p>
                  </div>
               </div>
               <div style={{ padding: '1.2rem', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '16px' }}>
                  <h4 style={{ color: '#b91c1c', margin: '0 0 5px 0', fontSize: '0.95rem' }}>⚠️ Twój kosztowny nawyk</h4>
                  <p style={{ margin: 0, color: '#7f1d1d', lineHeight: '1.4', fontSize: '0.85rem' }}>Pobierasz najwięcej energii o godzinie <strong>19:00</strong>, gdy prąd jest najdroższy.</p>
               </div>
            </div>
          </div>
        </div>

        {/* Dlaczego warto (PREMIUM PREVIEW) */}
        <div style={{ backgroundColor: '#f8fafc', padding: '5rem 0', borderTop: '1px solid #e2e8f0' }}>
          <div className="app-wrapper mobile-flex-wrap" style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', gap: '3rem', alignItems: 'center' }}>
            <div style={{ flex: '1 1 300px' }}>
              <h2 style={{ fontSize: '2.5rem', color: '#0f172a', fontWeight: 'bold', marginBottom: '1.5rem', lineHeight: '1.2' }}>
                Dlaczego intuicja to <span style={{ color: '#ef4444' }}>za mało?</span>
              </h2>
              <p style={{ color: '#475569', fontSize: '1.1rem', lineHeight: '1.7', marginBottom: '1.5rem' }}>
                Na taryfach dynamicznych ceny prądu potrafią zmienić się diametralnie z godziny na godzinę. Są całkowicie uzależnione od pogody — wiatru i słońca.
              </p>
              <p style={{ color: '#475569', fontSize: '1.1rem', lineHeight: '1.7', marginBottom: '2rem' }}>
                W bezchmurny weekend prąd w południe może być <strong>całkowicie darmowy</strong>. Ale wystarczy pochmurny wtorek, by wieczorne pranie kosztowało Cię 5 razy więcej niż zazwyczaj. Nasz system analizuje giełdę za Ciebie.
              </p>
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <div style={{ padding: '1.2rem', backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', flex: '1 1 120px' }}>
                   <div style={{ fontSize: '1.8rem', marginBottom: '5px' }}>☀️</div>
                   <span style={{ fontSize: '0.85rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 'bold' }}>Słoneczne południe</span>
                   <p style={{ fontWeight: '900', color: '#10b981', margin: '5px 0 0 0', fontSize: '1.3rem' }}>-0.05 PLN</p>
                </div>
                <div style={{ padding: '1.2rem', backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', flex: '1 1 120px' }}>
                   <div style={{ fontSize: '1.8rem', marginBottom: '5px' }}>☁️</div>
                   <span style={{ fontSize: '0.85rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 'bold' }}>Pochmurny wieczór</span>
                   <p style={{ fontWeight: '900', color: '#ef4444', margin: '5px 0 0 0', fontSize: '1.3rem' }}>0.85 PLN</p>
                </div>
              </div>
            </div>

            <div className="mobile-card-padding" style={{ flex: '1 1 300px', minWidth: 0, maxWidth: '100%', backgroundColor: '#ffffff', padding: '2rem', borderRadius: '24px', border: '1px solid #e2e8f0', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '10px' }}>
                  <span style={{ backgroundColor: '#fef08a', color: '#854d0e', padding: '6px 12px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>Wyłącznie w wersji PRO</span>
                  <span style={{ color: '#94a3b8', fontSize: '0.85rem', fontWeight: '500' }}>Przykładowy radar dzienny</span>
               </div>
               <div className="mobile-col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2.5rem' }}>
                 <div>
                    <p style={{ margin: '0 0 5px 0', color: '#64748b', fontSize: '0.8rem', textTransform: 'uppercase', fontWeight: '700' }}>🟢 Najtańsze okno</p>
                    <p style={{ margin: 0, fontSize: '2rem', fontWeight: '900', color: '#10b981' }}>11:00 - 14:00</p>
                 </div>
                 <div className="mobile-border-left-none" style={{ borderLeft: '1px solid #e2e8f0', paddingLeft: '1.5rem' }}>
                    <p style={{ margin: '0 0 5px 0', color: '#64748b', fontSize: '0.8rem', textTransform: 'uppercase', fontWeight: '700' }}>🔴 Unikaj zużycia</p>
                    <p style={{ margin: 0, fontSize: '2rem', fontWeight: '900', color: '#ef4444' }}>19:00 - 22:00</p>
                 </div>
               </div>
            </div>
          </div>
        </div>

        {/* FEATURES GRID */}
        <div style={{ backgroundColor: '#ffffff', padding: '5rem 0', borderTop: '1px solid #e2e8f0' }}>
          <div className="app-wrapper" style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <h2 style={{ textAlign: 'center', fontSize: '2.5rem', marginBottom: '4rem', color: '#0f172a', fontWeight: 'bold' }}>Co znajdziesz w środku?</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '2rem' }}>
              <div style={{ padding: '2.5rem', backgroundColor: '#f8fafc', borderRadius: '24px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>📊</div>
                <h3 style={{ fontSize: '1.4rem', fontWeight: 'bold', marginBottom: '1rem' }}>Analiza Nawyków</h3>
                <p style={{ color: '#64748b', lineHeight: '1.6' }}>Wskazujemy "wampiry energetyczne" w Twoim domu. Dowiesz się, o której godzinie Twoje zużycie generuje największe koszty.</p>
              </div>
              <div style={{ padding: '2.5rem', backgroundColor: '#f8fafc', borderRadius: '24px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>💰</div>
                <h3 style={{ fontSize: '1.4rem', fontWeight: 'bold', marginBottom: '1rem' }}>Kalkulator oszczędności</h3>
                <p style={{ color: '#64748b', lineHeight: '1.6' }}>Nasz algorytm AI oblicza, ile gotówki odzyskasz przy optymalizacji urządzeń domowych w odpowiednich godzinach.</p>
              </div>
              <div style={{ padding: '2.5rem', backgroundColor: '#f8fafc', borderRadius: '24px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🔮</div>
                <h3 style={{ fontSize: '1.4rem', fontWeight: 'bold', marginBottom: '1rem' }}>Prognoza RCE (PRO)</h3>
                <p style={{ color: '#64748b', lineHeight: '1.6' }}>Codziennie analizujemy ceny giełdowe na bieżący dzień. Planuj pranie, zmywanie i ładowanie auta w najtańszych oknach.</p>
              </div>
              <div style={{ padding: '2.5rem', backgroundColor: '#f8fafc', borderRadius: '24px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🔌</div>
                <h3 style={{ fontSize: '1.4rem', fontWeight: 'bold', marginBottom: '1rem' }}>Smart Home API</h3>
                <p style={{ color: '#64748b', lineHeight: '1.6' }}>Stabilne, wyczyszczone dane dla Home Assistant i instalatorów pomp ciepła. Zautomatyzuj swój dom profesjonalnie.</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
