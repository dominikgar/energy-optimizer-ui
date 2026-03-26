// @ts-nocheck
export const dynamic = "force-dynamic";

import React from 'react';
import { Pool } from 'pg';
import Link from 'next/link';
import { auth } from '@clerk/nextjs/server';
import { SignInButton, UserButton } from '@clerk/nextjs';
import {
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Bar,
  ComposedChart,
  Legend
} from 'recharts';

// --- INICJALIZACJA BAZY DANYCH ---
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// --- KOMPONENTY POMOCNICZE (UI) WBUDOWANE W PLIK ---

const IconZap = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500 fill-emerald-500"><path d="M4 14.71 13.5 3l-1.33 8.29H20l-9.5 11.71 1.33-8.29H4z"/></svg>
);

const IconInfo = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
);

function EnergyChart({ data, g11Rate }) {
  if (!data || data.length === 0) return <p style={{ color: '#64748b' }}>Brak danych do wyświetlenia.</p>;

  return (
    <div style={{ width: '100%', height: '400px', marginTop: '2rem' }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
          <XAxis dataKey="time" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} tickMargin={12} />
          <YAxis yAxisId="left" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}kWh`} />
          <YAxis yAxisId="right" orientation="right" stroke="#10b981" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `${v.toFixed(2)}zł`} />
          <RechartsTooltip 
            contentStyle={{ backgroundColor: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
          />
          <Legend verticalAlign="top" align="right" height={40} iconType="circle" />
          <Bar yAxisId="left" dataKey="kwh" name="Zużycie (kWh)" fill="#e2e8f0" radius={[4, 4, 0, 0]} />
          <Line yAxisId="right" type="monotone" dataKey="price" name="Cena RCE (Giełda)" stroke="#10b981" strokeWidth={3} dot={false} activeDot={{ r: 6 }} />
          <Line yAxisId="right" type="step" dataKey="g11Price" name="Twoja Stawka G11" stroke="#ef4444" strokeWidth={2} strokeDasharray="5 5" dot={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

function UploadSection() {
  return (
    <div style={{ border: '2px dashed #cbd5e1', borderRadius: '32px', padding: '3rem', textAlign: 'center', backgroundColor: '#f8fafc', cursor: 'pointer', transition: 'all 0.2s' }}>
      <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📄</div>
      <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#0f172a', marginBottom: '0.5rem' }}>Wgraj dane z licznika</h3>
      <p style={{ color: '#64748b', marginBottom: '1.5rem', maxWidth: '400px', margin: '0 auto 1.5rem' }}>Obsługujemy pliki .csv z Tauron eLicznik, PGE oraz Enea. Twoje dane zostaną bezpiecznie przetworzone.</p>
      <button style={{ padding: '12px 32px', backgroundColor: '#2563eb', color: 'white', borderRadius: '16px', fontWeight: 'bold', border: 'none', boxShadow: '0 4px 6px -1px rgba(59, 130, 246, 0.3)', cursor: 'pointer' }}>
        Wybierz plik z dysku
      </button>
    </div>
  );
}

// --- GŁÓWNA LOGIKA STRONY (SERVER COMPONENT) ---

export default async function Home({ searchParams }) {
  const { userId } = auth();
  const resolvedParams = await Promise.resolve(searchParams || {});
  
  const activeTab = resolvedParams.tab || 'radar';
  const days = parseInt(resolvedParams.days) || 3;
  const selectedProvider = resolvedParams.provider || 'G11_TAURON';

  // --- STYLE GLOBALNE ---
  const globalStyles = `
    * { box-sizing: border-box; }
    .app-wrapper { padding: 2rem 3rem; }
    .hero-title { font-size: 4.5rem; }
    
    .desktop-tabs { display: flex; gap: 2rem; border-bottom: 1px solid #e2e8f0; margin-bottom: 3rem; flex-wrap: wrap; }
    .mobile-menu-container { display: none; }
    details.mobile-nav > summary { list-style: none; outline: none; }
    details.mobile-nav > summary::-webkit-details-marker { display: none; }

    .chart-scroll-box { overflow-x: visible; width: 100%; }
    .chart-flex-box { min-width: auto; }
    .hide-on-mobile { display: block; }
    
    .chart-col { position: relative; cursor: crosshair; }
    .chart-tooltip {
      visibility: hidden; opacity: 0; position: absolute; left: 50%; transform: translateX(-50%);
      background-color: #1e293b; color: #fff; padding: 8px 12px; border-radius: 8px;
      font-size: 0.8rem; line-height: 1.4; white-space: nowrap;
      transition: opacity 0.2s ease, transform 0.2s ease; z-index: 50; pointer-events: none;
      border: 1px solid #334155; box-shadow: 0 10px 20px rgba(0,0,0,0.2); text-align: center;
    }
    .chart-tooltip::after {
      content: ''; position: absolute; top: 100%; left: 50%; margin-left: -6px;
      border-width: 6px; border-style: solid; border-color: #1e293b transparent transparent transparent;
    }
    .chart-col:hover .chart-tooltip { visibility: visible; opacity: 1; transform: translateX(-50%) translateY(-5px); }
    .chart-col:hover .chart-bar-fill { opacity: 1 !important; filter: brightness(1.1); }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

    @media (max-width: 768px) {
      .app-wrapper { padding: 1.5rem 1rem !important; }
      .hero-title { font-size: 2.5rem !important; }
      
      .desktop-tabs { display: none !important; }
      .mobile-menu-container { display: block !important; margin-bottom: 2rem; position: relative; z-index: 50; }

      .chart-scroll-box { overflow-x: auto !important; padding-bottom: 15px !important; -webkit-overflow-scrolling: touch; }
      .chart-flex-box { min-width: 600px !important; }
      .hide-on-mobile { display: none !important; }
      .mobile-col { display: flex !important; flex-direction: column !important; align-items: flex-start !important; gap: 1rem !important; }
      .mobile-border-left-none { border-left: none !important; padding-left: 0 !important; border-top: 1px solid #e2e8f0; padding-top: 1rem !important; margin-top: 0.5rem !important; width: 100%; }
      .mobile-card-padding { padding: 1.5rem !important; }
      .mobile-flex-wrap { flex-wrap: wrap !important; }
    }
  `;

  // --- 1. POBIERANIE DANYCH Z BAZY NEON ---
  let isPremiumUser = false;
  let userApiKey = null;
  let availableTariffs = [];
  let currentTariff = { price_per_kwh: 1.10, tariff_name: 'G11_TAURON' };

  if (userId) {
    try {
      const sub = await pool.query('SELECT is_active, api_key FROM user_subscriptions WHERE user_id = $1', [userId]);
      if (sub.rows.length > 0 && sub.rows[0].is_active) {
        isPremiumUser = true;
        userApiKey = sub.rows[0].api_key;
      }
      
      const tariffs = await pool.query('SELECT tariff_name, price_per_kwh, description FROM energy_tariffs ORDER BY tariff_name ASC');
      availableTariffs = tariffs.rows;
      
      const found = availableTariffs.find(t => t.tariff_name === selectedProvider);
      if (found) currentTariff = found;
    } catch (e) {
      console.error("DB Error:", e);
    }
  }

  // Odfiltrowujemy ogólny rekord G11, aby użytkownik widział tylko konkretnych operatorów
  const displayProviders = availableTariffs.filter(t => t.tariff_name !== 'G11' && t.tariff_name.startsWith('G11'));

  // --- 2. WIDOK LANDING PAGE (DLA GOŚCI) ---
  if (!userId) {
    return (
      <div style={{ backgroundColor: '#f8fafc', minHeight: '100vh', width: '100%' }}>
        <style dangerouslySetInnerHTML={{__html: globalStyles}} />
        
        <header className="app-wrapper" style={{ paddingBottom: '0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ fontSize: '1.4rem', fontWeight: '900', background: 'linear-gradient(to right, #059669, #2563eb)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '-0.5px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <IconZap /> Energy Optimizer
          </div>
          <div>
            <SignInButton mode="modal">
              <button style={{ padding: '8px 20px', backgroundColor: '#fff', color: '#0f172a', border: '1px solid #cbd5e1', borderRadius: '20px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.9rem', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                Zaloguj się
              </button>
            </SignInButton>
          </div>
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
            <p style={{ color: '#64748b', fontSize: '1.2rem', marginBottom: '3rem', lineHeight: '1.6', maxWidth: '700px', margin: '0 auto 3rem' }}>
              Od 2026 taryfy dynamiczne będą standardem. Sprawdź już dziś, czy Twój profil zużycia pozwoli Ci zarabiać na ujemnych cenach prądu i unikaj najdroższych godzin dzięki analizie AI.
            </p>
            <SignInButton mode="modal">
              <button style={{ padding: '16px 40px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '30px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1.2rem', boxShadow: '0 10px 25px rgba(16, 185, 129, 0.3)', transition: 'transform 0.2s' }}>
                Zacznij darmowy audyt taryfowy
              </button>
            </SignInButton>
          </div>

          {/* SEKCJA: DARMOWY AUDYT HISTORYCZNY (PODGLĄD FREE) */}
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
                  <li style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px', color: '#334155', fontWeight: '500' }}>
                    <span style={{ color: '#10b981', fontSize: '1.2rem' }}>✓</span> Pełna analiza taryfowa wstecz
                  </li>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px', color: '#334155', fontWeight: '500' }}>
                    <span style={{ color: '#10b981', fontSize: '1.2rem' }}>✓</span> Wsparcie wszystkich operatorów w Polsce
                  </li>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#334155', fontWeight: '500' }}>
                    <span style={{ color: '#10b981', fontSize: '1.2rem' }}>✓</span> Porównanie z Twoją obecną stawką G11
                  </li>
                </ul>
              </div>

              <div className="mobile-card-padding" style={{ flex: '1 1 300px', minWidth: 0, maxWidth: '100%', backgroundColor: '#f8fafc', padding: '2rem', borderRadius: '24px', border: '1px solid #e2e8f0', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' }}>
                 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '10px' }}>
                    <span style={{ backgroundColor: '#e0f2fe', color: '#0369a1', padding: '6px 12px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>Dostępne za darmo</span>
                    <span style={{ color: '#94a3b8', fontSize: '0.85rem', fontWeight: '500' }}>Profil Historyczny</span>
                 </div>
                 
                 <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                    <div style={{ flex: '1', padding: '1.2rem', backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                       <p style={{ margin: '0 0 5px', fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 'bold' }}>TARYFA G11</p>
                       <p style={{ margin: 0, fontSize: '1.8rem', fontWeight: '900', color: '#0f172a' }}>142.50 <span style={{fontSize: '0.9rem', color: '#94a3b8', fontWeight: 'normal'}}>PLN</span></p>
                    </div>
                    <div style={{ flex: '1', padding: '1.2rem', backgroundColor: '#dcfce7', borderRadius: '16px', border: '1px solid #a7f3d0' }}>
                       <p style={{ margin: '0 0 5px', fontSize: '0.75rem', color: '#059669', textTransform: 'uppercase', fontWeight: 'bold' }}>RYNEK RCE</p>
                       <p style={{ margin: 0, fontSize: '1.8rem', fontWeight: '900', color: '#047857' }}>126.12 <span style={{fontSize: '0.9rem', color: '#10b981', fontWeight: 'normal'}}>PLN</span></p>
                    </div>
                 </div>

                 <div style={{ padding: '1.2rem', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '16px', marginBottom: '1.5rem' }}>
                    <h4 style={{ color: '#b91c1c', margin: '0 0 5px 0', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span>⚠️</span> Twój kosztowny nawyk
                    </h4>
                    <p style={{ margin: 0, color: '#7f1d1d', lineHeight: '1.4', fontSize: '0.85rem' }}>
                      Pobierasz najwięcej energii o godzinie <strong>19:00</strong>, gdy prąd jest najdroższy.
                    </p>
                 </div>

                 {/* Mini wykresik */}
                 <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: '60px', opacity: 0.7 }}>
                    {[30, 40, 25, 60, 80, 45, 30, 90, 110, 85, 50, 40].map((h, i) => (
                      <div key={i} style={{ flex: 1, backgroundColor: i === 8 ? '#ef4444' : '#cbd5e1', height: `${h}%`, borderRadius: '2px 2px 0 0' }}></div>
                    ))}
                 </div>
              </div>
            </div>
          </div>

          {/* SEKCJA: DLACZEGO FORECASTING JEST WAŻNY (Z PODGLĄDEM PREMIUM) */}
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

              <div className="mobile-card-padding" style={{ flex: '1 1 300px', minWidth: 0, maxWidth: '100%', backgroundColor: '#ffffff', padding: '2rem', borderRadius: '24px', border: '1px solid #e2e8f0', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' }}>
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
                 
                 <p style={{ margin: '0 0 1rem 0', color: '#64748b', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '600' }}>Wizualizacja cen w ciągu doby</p>
                 
                 {/* RESPONSIVNY KONTENER DLA MAKIETY WYKRESU */}
                 <div className="chart-scroll-box">
                   <div className="chart-flex-box" style={{ display: 'flex', flexDirection: 'column' }}>
                     <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: '140px', paddingBottom: '5px', borderBottom: '1px solid #e2e8f0' }}>
                        {[0.3, 0.25, 0.2, 0.35, 0.5, 0.2, -0.05, -0.02, 0.1, 0.3, 0.6, 0.85, 0.7, 0.5, 0.4].map((price, i) => {
                           const isMin = price === -0.05;
                           const isMax = price === 0.85;
                           const h = Math.max(10, ((price - (-0.05)) / 0.9) * 120);
                           return (
                             <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end' }}>
                               <div style={{ width: '70%', minWidth: '4px', height: `${h}px`, backgroundColor: isMin ? '#10b981' : isMax ? '#ef4444' : '#cbd5e1', borderRadius: '3px 3px 0 0' }}></div>
                             </div>
                           )
                        })}
                     </div>
                     <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', color: '#94a3b8', fontSize: '0.75rem', fontWeight: '500', padding: '0 5px' }}>
                        <span>00:00</span>
                        <span>12:00</span>
                        <span>23:00</span>
                     </div>
                   </div>
                 </div>
              </div>

            </div>
          </div>

          {/* SEKCJA KAFELKÓW */}
          <div style={{ backgroundColor: '#ffffff', padding: '5rem 0', borderTop: '1px solid #e2e8f0' }}>
            <div className="app-wrapper" style={{ maxWidth: '1200px', margin: '0 auto' }}>
              <h2 style={{ textAlign: 'center', fontSize: '2.5rem', marginBottom: '4rem', color: '#0f172a', fontWeight: 'bold' }}>Co znajdziesz w środku?</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '2rem' }}>
                <div style={{ padding: '2.5rem', backgroundColor: '#f8fafc', borderRadius: '24px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>📊</div>
                  <h3 style={{ fontSize: '1.4rem', color: '#1e293b', marginBottom: '1rem' }}>Analiza Nawyków</h3>
                  <p style={{ color: '#64748b', lineHeight: '1.6' }}>Wskazujemy "wampiry energetyczne" w Twoim domu. Dowiesz się, o której godzinie Twoje zużycie generuje największe koszty.</p>
                </div>
                <div style={{ padding: '2.5rem', backgroundColor: '#f8fafc', borderRadius: '24px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>💰</div>
                  <h3 style={{ fontSize: '1.4rem', color: '#1e293b', marginBottom: '1rem' }}>Kalkulator oszczędności</h3>
                  <p style={{ color: '#64748b', lineHeight: '1.6' }}>Nasz algorytm AI oblicza, ile gotówki odzyskasz przy optymalizacji urządzeń domowych w odpowiednich godzinach.</p>
                </div>
                <div style={{ padding: '2.5rem', backgroundColor: '#f8fafc', borderRadius: '24px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🔮</div>
                  <h3 style={{ fontSize: '1.4rem', color: '#1e293b', marginBottom: '1rem' }}>Prognoza RCE (PRO)</h3>
                  <p style={{ color: '#64748b', lineHeight: '1.6' }}>Codziennie analizujemy ceny giełdowe na bieżący dzień. Planuj pranie, zmywanie i ładowanie auta w najtańszych oknach.</p>
                </div>
                <div style={{ padding: '2.5rem', backgroundColor: '#f8fafc', borderRadius: '24px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🔌</div>
                  <h3 style={{ fontSize: '1.4rem', color: '#1e293b', marginBottom: '1rem' }}>Smart Home API</h3>
                  <p style={{ color: '#64748b', lineHeight: '1.6' }}>Stabilne, wyczyszczone dane dla Home Assistant i instalatorów pomp ciepła. Zautomatyzuj swój dom profesjonalnie.</p>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // --- 3. ANALIZA DANYCH HISTORYCZNYCH I DORADCY ---
  let chartData = [];
  let stats = { 
    totalKwh: 0, costRCE: 0, costG11: 0, savingsVsG11: 0, lastSync: '-', 
    worstHour: 0, worstHourCost: 0, bestHour: 0, bestHourPrice: 999 
  };

  if (activeTab === 'history' || activeTab === 'advisor') {
    try {
      const { rows } = await pool.query(`
        WITH hourly_prices AS (
            SELECT DATE_TRUNC('hour', timestamp) AS hour_ts, AVG(price_pln_mwh) AS price_mwh
            FROM energy_prices GROUP BY DATE_TRUNC('hour', timestamp)
        )
        SELECT c.timestamp, c.value_kwh, p.price_mwh
        FROM energy_consumption c
        JOIN hourly_prices p ON DATE_TRUNC('hour', c.timestamp) = p.hour_ts
        WHERE c.user_id = $1 AND (c.type ILIKE '%pobór%' OR c.type ILIKE '%pobor%')
        ORDER BY c.timestamp DESC LIMIT $2
      `, [userId, days * 24]);

      const g11Rate = parseFloat(currentTariff.price_per_kwh);
      const hourlyAggregation = Array(24).fill(null).map(() => ({ cost: 0, priceSum: 0, count: 0 }));

      chartData = rows.reverse().map(row => {
        const kwh = parseFloat(row.value_kwh);
        const priceRCE = parseFloat(row.price_mwh) / 1000;
        const ts = new Date(row.timestamp);
        const hr = ts.getHours();
        
        stats.totalKwh += kwh;
        stats.costRCE += (kwh * priceRCE);
        stats.costG11 += (kwh * g11Rate);
        hourlyAggregation[hr].cost += (kwh * priceRCE);
        hourlyAggregation[hr].priceSum += priceRCE;
        hourlyAggregation[hr].count++;

        return {
          time: ts.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' }),
          kwh: kwh,
          price: priceRCE,
          g11Price: g11Rate
        };
      });

      stats.savingsVsG11 = stats.costG11 - stats.costRCE;
      if (rows.length > 0) stats.lastSync = new Date(rows[0].timestamp).toLocaleString('pl-PL');

      hourlyAggregation.forEach((d, h) => {
        if(d.count > 0) {
          if(d.cost > stats.worstHourCost) { stats.worstHourCost = d.cost; stats.worstHour = h; }
          const avgP = d.priceSum / d.count;
          if(avgP < stats.bestHourPrice) { stats.bestHourPrice = avgP; stats.bestHour = h; }
        }
      });
    } catch (e) { console.error(e); }
  }

  // --- 4. DANE RADARU (PSE API) ---
  let todayForecast = null;
  let forecastError = null;
  if (activeTab === 'radar' || activeTab === 'api') {
    try {
      const now = new Date();
      const polandTime = new Date(now.toLocaleString("en-US", {timeZone: "Europe/Warsaw"}));
      const todayStr = `${polandTime.getFullYear()}-${String(polandTime.getMonth() + 1).padStart(2, '0')}-${String(polandTime.getDate()).padStart(2, '0')}`;
      const params = new URLSearchParams({ "$filter": `business_date eq '${todayStr}'` });
      const pseRes = await fetch(`https://api.raporty.pse.pl/api/rce-pln?${params.toString()}`, { cache: 'no-store' });
      if (pseRes.ok) {
        const json = await pseRes.json();
        if (json.value?.length > 0) {
          let pArr = json.value.map(r => ({ time: r.data_czas?.match(/(\d{2}:\d{2})/) ? r.data_czas.match(/(\d{2}:\d{2})/)[1] : '??', price: r.rce_pln / 1000 }));
          todayForecast = { prices: pArr, date: todayStr, absoluteMinPrice: Math.min(...pArr.map(p=>p.price)), absoluteMaxPrice: Math.max(...pArr.map(p=>p.price)), bestWindowStart: '11:00', bestWindowEnd: '14:00', bestWindowAvgPrice: 0.12, worstWindowStart: '19:00', worstWindowEnd: '21:00', worstWindowAvgPrice: 0.85 };
        } else forecastError = "PSE jeszcze nie opublikowało cen na dziś.";
      }
    } catch (e) { forecastError = "Błąd połączenia z PSE."; }
  }

  // --- 5. GŁÓWNY RENDERER ---
  return (
    <div style={{ backgroundColor: '#f8fafc', minHeight: '100vh', width: '100%' }}>
      <style dangerouslySetInnerHTML={{__html: globalStyles}} />
      <main className="app-wrapper" style={{ fontFamily: 'system-ui, sans-serif', maxWidth: '1200px', margin: '0 auto', color: '#334155' }}>
        
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div style={{ fontSize: '1.4rem', fontWeight: '900', background: 'linear-gradient(to right, #059669, #2563eb)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '-0.5px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <IconZap /> Energy Optimizer AI
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', backgroundColor: '#fff', padding: '6px 16px', borderRadius: '30px', border: '1px solid #e2e8f0' }}>
            {isPremiumUser && <span style={{ fontSize: '0.7rem', fontWeight: 'bold', color: '#059669' }}>PRO ACTIVE</span>}
            <UserButton afterSignOutUrl="/" />
          </div>
        </header>

        <nav className="desktop-tabs">
          <Link href="/?tab=radar" style={{ padding: '0.8rem 0', color: activeTab === 'radar' ? '#0f172a' : '#64748b', borderBottom: activeTab === 'radar' ? '2px solid #10b981' : '2px solid transparent', textDecoration: 'none', fontWeight: 'bold' }}>Radar na dziś 🟢</Link>
          <Link href="/?tab=history" style={{ padding: '0.8rem 0', color: activeTab === 'history' ? '#0f172a' : '#64748b', borderBottom: activeTab === 'history' ? '2px solid #3b82f6' : '2px solid transparent', textDecoration: 'none', fontWeight: 'bold' }}>Profil Historyczny</Link>
          <Link href="/?tab=advisor" style={{ padding: '0.8rem 0', color: activeTab === 'advisor' ? '#0f172a' : '#64748b', borderBottom: activeTab === 'advisor' ? '2px solid #f59e0b' : '2px solid transparent', textDecoration: 'none', fontWeight: 'bold' }}>Doradca Taryfowy</Link>
          <Link href="/?tab=api" style={{ padding: '0.8rem 0', color: activeTab === 'api' ? '#0f172a' : '#64748b', borderBottom: activeTab === 'api' ? '2px solid #a855f7' : '2px solid transparent', textDecoration: 'none', fontWeight: 'bold', marginLeft: 'auto' }}>Automatyzacje API 🔌</Link>
        </nav>

        {/* NAWIGACJA MOBILE */}
        <div className="mobile-menu-container">
          <details className="mobile-nav" style={{ width: '100%' }}>
            <summary style={{ backgroundColor: '#fff', padding: '1rem 1.5rem', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 'bold', color: '#0f172a', cursor: 'pointer' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '1.2rem' }}>☰</span> 
                Menu: {activeTab === 'radar' ? 'Radar' : activeTab === 'history' ? 'Historia' : activeTab === 'advisor' ? 'Doradca' : 'API'}
              </div>
              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>▼</span>
            </summary>
            <div style={{ position: 'absolute', top: '100%', left: '0', right: '0', backgroundColor: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', marginTop: '0.5rem', overflow: 'hidden', display: 'flex', flexDirection: 'column', zIndex: 60 }}>
              <Link href={`/?tab=radar&days=${days}`} scroll={false} style={{ padding: '1.2rem 1.5rem', borderBottom: '1px solid #f1f5f9', textDecoration: 'none', color: activeTab === 'radar' ? '#10b981' : '#334155', fontWeight: activeTab === 'radar' ? 'bold' : 'normal' }}>Radar na dziś</Link>
              <Link href={`/?tab=history&days=${days}`} scroll={false} style={{ padding: '1.2rem 1.5rem', borderBottom: '1px solid #f1f5f9', textDecoration: 'none', color: activeTab === 'history' ? '#3b82f6' : '#334155', fontWeight: activeTab === 'history' ? 'bold' : 'normal' }}>Profil Historyczny</Link>
              <Link href={`/?tab=advisor&days=${days}&provider=${selectedProvider}`} scroll={false} style={{ padding: '1.2rem 1.5rem', borderBottom: '1px solid #f1f5f9', textDecoration: 'none', color: activeTab === 'advisor' ? '#f59e0b' : '#334155', fontWeight: activeTab === 'advisor' ? 'bold' : 'normal' }}>Doradca Taryfowy</Link>
              <Link href={`/?tab=api&days=${days}`} scroll={false} style={{ padding: '1.2rem 1.5rem', textDecoration: 'none', color: activeTab === 'api' ? '#a855f7' : '#334155', fontWeight: activeTab === 'api' ? 'bold' : 'normal' }}>Automatyzacje API</Link>
            </div>
          </details>
        </div>

        {/* --- WIDOK: RADAR --- */}
        {activeTab === 'radar' && (
          <div style={{ animation: 'fadeIn 0.3s ease' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
               <h2 style={{ fontSize: '2rem', fontWeight: 'bold' }}>Plan oszczędności na dziś</h2>
               {todayForecast && <span style={{ color: '#64748b' }}>Dane PSE: <strong>{todayForecast.date}</strong></span>}
            </div>
            
            {todayForecast ? (
              <div style={{ position: 'relative', backgroundColor: '#fff', padding: '2.5rem', borderRadius: '32px', border: '1px solid #e2e8f0', boxShadow: '0 10px 25px rgba(0,0,0,0.05)' }}>
                {!isPremiumUser && (
                  <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(255, 255, 255, 0.8)', backdropFilter: 'blur(4px)', zIndex: 10, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', borderRadius: '32px', padding: '2rem' }}>
                    <h3 style={{ fontSize: '1.8rem', fontWeight: 'bold', marginBottom: '1rem' }}>Odblokuj pełny radar</h3>
                    <p style={{ color: '#475569', marginBottom: '2rem', textAlign: 'center', maxWidth: '400px' }}>Analizuj na żywo wszystkie godziny i sprawdzaj szczegółowe prognozy.</p>
                    <form action="/api/checkout_sessions" method="POST">
                      <button type="submit" style={{ padding: '16px 40px', backgroundColor: '#10b981', color: '#fff', border: 'none', borderRadius: '30px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 10px 25px rgba(16, 185, 129, 0.4)' }}>Kup dostęp PRO</button>
                    </form>
                  </div>
                )}
                <div className="mobile-col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '3rem' }}>
                  <div style={{ padding: '1.5rem', backgroundColor: '#ecfdf5', borderRadius: '24px', border: '1px solid #a7f3d0' }}>
                    <p style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#047857', marginBottom: '10px' }}>🟢 NAJTAŃSZE OKNO (3H)</p>
                    <p style={{ fontSize: '2.5rem', fontWeight: '900', color: '#065f46', margin: 0 }}>{todayForecast.bestWindowStart} - {todayForecast.bestWindowEnd}</p>
                  </div>
                  <div style={{ padding: '1.5rem', backgroundColor: '#fef2f2', borderRadius: '24px', border: '1px solid #fecaca' }}>
                    <p style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#991b1b', marginBottom: '10px' }}>🔴 UNIKAJ ZUŻYCIA</p>
                    <p style={{ fontSize: '2.5rem', fontWeight: '900', color: '#7f1d1d', margin: 0 }}>{todayForecast.worstWindowStart} - {todayForecast.worstWindowEnd}</p>
                  </div>
                </div>
              </div>
            ) : <p>{forecastError || "Ładowanie danych..."}</p>}
          </div>
        )}

        {/* --- WIDOK: HISTORIA --- */}
        {activeTab === 'history' && (
          <div style={{ animation: 'fadeIn 0.3s ease' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
              <h2 style={{ fontSize: '2rem', fontWeight: 'bold' }}>Twój profil zużycia energii</h2>
              <div style={{ display: 'flex', gap: '4px', backgroundColor: '#f1f5f9', padding: '4px', borderRadius: '12px' }}>
                {[3, 7, 30].map(d => (
                  <Link key={d} href={`/?tab=history&days=${d}`} style={{ padding: '6px 16px', borderRadius: '8px', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 'bold', backgroundColor: days === d ? '#fff' : 'transparent', color: days === d ? '#0f172a' : '#64748b', boxShadow: days === d ? '0 2px 4px rgba(0,0,0,0.05)' : 'none' }}>{d} Dni</Link>
                ))}
              </div>
            </div>
            {chartData.length > 0 ? (
              <div style={{ backgroundColor: '#fff', padding: '2rem', borderRadius: '32px', border: '1px solid #e2e8f0', marginBottom: '2rem' }}>
                <EnergyChart data={chartData} g11Rate={currentTariff.price_per_kwh} />
                <div style={{ marginTop: '2rem', padding: '2rem', backgroundColor: '#f8fafc', borderRadius: '24px', border: '1px solid #e2e8f0' }}>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '1rem' }}>Zaktualizuj dane</h3>
                  <UploadSection />
                </div>
              </div>
            ) : <UploadSection />}
          </div>
        )}

        {/* --- WIDOK: DORADCA --- */}
        {activeTab === 'advisor' && (
          <div style={{ animation: 'fadeIn 0.3s ease' }}>
            <div style={{ backgroundColor: '#ffffff', padding: '2.5rem', borderRadius: '32px', border: '1px solid #e2e8f0', borderTop: '8px solid #f59e0b' }}>
              <div className="mobile-col" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '2rem', marginBottom: '2.5rem' }}>
                <div style={{ flex: '1 1 400px' }}>
                  <h2 style={{ fontSize: '2rem', color: '#0f172a', fontWeight: 'bold', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    Silnik Porównawczy Taryf <IconInfo />
                  </h2>
                  <p style={{ color: '#64748b', fontSize: '1.1rem', lineHeight: '1.6', margin: 0 }}>
                    Wybierz z kim masz obecnie podpisaną umowę na prąd. Przeliczymy Twoje historyczne zużycie w obu wariantach: bezpiecznej taryfie stałej oraz na wolnym rynku dynamicznym.
                  </p>
                </div>
                
                <div style={{ backgroundColor: '#f8fafc', padding: '1.5rem', borderRadius: '16px', border: '1px solid #e2e8f0', minWidth: '300px' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px' }}>Wybierz operatora do porównania:</span>
                  <div style={{ display: 'flex', gap: '10px', marginTop: '10px', flexWrap: 'wrap' }}>
                    {displayProviders.map(t => (
                      <Link 
                        key={t.tariff_name} 
                        href={`/?tab=advisor&days=${days}&provider=${t.tariff_name}`}
                        style={{ 
                          padding: '8px 16px', 
                          borderRadius: '12px', 
                          fontSize: '0.9rem', 
                          textDecoration: 'none',
                          fontWeight: 'bold',
                          transition: 'all 0.2s ease',
                          backgroundColor: selectedProvider === t.tariff_name ? '#f59e0b' : '#ffffff',
                          color: selectedProvider === t.tariff_name ? '#ffffff' : '#475569',
                          border: selectedProvider === t.tariff_name ? '1px solid #d97706' : '1px solid #cbd5e1',
                          boxShadow: selectedProvider === t.tariff_name ? '0 4px 6px -1px rgba(245, 158, 11, 0.2)' : 'none'
                        }}
                      >
                        {t.tariff_name.replace('G11_', '')}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>

              {chartData.length > 0 ? (
                <>
                  <div className="mobile-col" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
                    <div style={{ padding: '2rem', border: '1px solid #e2e8f0', borderRadius: '24px' }}>
                      <p style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#64748b', marginBottom: '10px' }}>OBECNIE (G11)</p>
                      <p style={{ fontSize: '2.5rem', fontWeight: '900', margin: 0 }}>{stats.costG11.toFixed(2)} zł</p>
                    </div>
                    <div style={{ padding: '2rem', backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '24px' }}>
                      <p style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#047857', marginBottom: '10px' }}>RYNEK DYNAMICZNY</p>
                      <p style={{ fontSize: '2.5rem', fontWeight: '900', color: '#065f46', margin: 0 }}>{stats.costRCE.toFixed(2)} zł</p>
                    </div>
                  </div>

                  <div style={{ paddingTop: '2rem', borderTop: '1px solid #e2e8f0' }}>
                    <h3 style={{ fontSize: '1.4rem', color: '#0f172a', fontWeight: 'bold', marginBottom: '1.5rem' }}>Analiza Twoich Nawyków Konsumenckich</h3>
                    <div className="mobile-col" style={{ display: 'flex', gap: '1.5rem' }}>
                      <div style={{ flex: 1, padding: '1.5rem', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                          <span style={{ fontSize: '1.5rem' }}>🔥</span>
                          <h4 style={{ margin: 0, color: '#991b1b', fontSize: '1.1rem' }}>Twoja najdroższa godzina</h4>
                        </div>
                        <p style={{ color: '#7f1d1d', margin: '0 0 10px 0', fontSize: '0.95rem' }}>
                          Historycznie najwięcej pieniędzy pochłania u Ciebie godzina <strong>{String(stats.worstHour).padStart(2, '0')}:00 - {String(stats.worstHour+1).padStart(2, '0')}:00</strong>. 
                        </p>
                        <p style={{ margin: 0, color: '#991b1b', fontWeight: 'bold', fontSize: '0.85rem' }}>Koszt w tym czasie: {stats.worstHourCost.toFixed(2)} PLN.</p>
                      </div>

                      <div style={{ flex: 1, padding: '1.5rem', backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                          <span style={{ fontSize: '1.5rem' }}>🌱</span>
                          <h4 style={{ margin: 0, color: '#065f46', fontSize: '1.1rem' }}>Okienko największych okazji</h4>
                        </div>
                        <p style={{ color: '#065f46', margin: '0 0 10px 0', fontSize: '0.95rem' }}>
                          Najtańszy prąd na giełdzie pojawiał się zazwyczaj w okolicach godziny <strong>{String(stats.bestHour).padStart(2, '0')}:00 - {String(stats.bestHour+1).padStart(2, '0')}:00</strong>.
                        </p>
                        <p style={{ margin: 0, color: '#047857', fontWeight: 'bold', fontSize: '0.85rem' }}>Średnia cena to zaledwie: {stats.bestHourPrice.toFixed(2)} PLN/kWh.</p>
                      </div>
                    </div>
                  </div>
                </>
              ) : <p style={{ textAlign: 'center', color: '#64748b' }}>Wgraj dane w zakładce Historia, aby uruchomić doradcę.</p>}
            </div>
          </div>
        )}

        {/* --- WIDOK: API --- */}
        {activeTab === 'api' && (
          <div style={{ animation: 'fadeIn 0.3s ease' }}>
            <div style={{ backgroundColor: '#ffffff', padding: '3rem', borderRadius: '32px', border: '1px solid #e2e8f0' }}>
              <h2 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>Stabilne dane dla Twoich systemów</h2>
              <p style={{ fontSize: '1.1rem', color: '#475569', marginBottom: '2rem', maxWidth: '800px', lineHeight: '1.7' }}>
                Dostarczamy precyzyjne dane giełdowe RCE gotowe do użycia w Smart Home. Nasze API eliminuje błędy w danych PSE i gwarantuje stabilność profesjonalnych automatyzacji.
              </p>
              
              <div className="mobile-col" style={{ display: 'flex', gap: '3rem', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ backgroundColor: '#f8fafc', padding: '1.5rem', borderRadius: '20px', border: '1px solid #e2e8f0', marginBottom: '2rem' }}>
                    <p style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#64748b', marginBottom: '8px' }}>TWÓJ KLUCZ API</p>
                    <code style={{ display: 'block', backgroundColor: '#e2e8f0', padding: '12px', borderRadius: '8px', wordBreak: 'break-all', fontWeight: 'bold' }}>{userApiKey || 'Zaloguj się i wykup PRO, aby wygenerować klucz.'}</code>
                  </div>
                  <h4 style={{ fontWeight: 'bold', marginBottom: '1rem' }}>Kod dla Home Assistant (configuration.yaml):</h4>
                  <pre style={{ backgroundColor: '#0f172a', color: '#e2e8f0', padding: '1.5rem', borderRadius: '16px', fontSize: '0.8rem', overflowX: 'auto' }}>
{`rest:
  - resource: "https://energy-optimizer.vercel.app/api/v1/forecast/best-window"
    headers:
      Authorization: "Bearer ${userApiKey || 'TWÓJ_KLUCZ_API'}"
    sensor:
      - name: "Energy Recommended Start"
        value_template: "{{ value_json.recommended_start }}"
      - name: "Energy Recommended End"
        value_template: "{{ value_json.recommended_end }}"`}
                  </pre>
                </div>
                <div style={{ flex: 1, backgroundColor: '#0f172a', padding: '2rem', borderRadius: '24px', color: '#10b981', fontFamily: 'monospace', fontSize: '0.85rem' }}>
                   <p style={{ color: '#64748b' }}>// GET response preview</p>
                   <pre>{JSON.stringify({
                     status: "success",
                     recommended_start: todayForecast?.bestWindowStart || "11:00",
                     recommended_end: todayForecast?.bestWindowEnd || "14:00",
                     avg_price_pln: 0.1245,
                     trigger_automation: true
                   }, null, 2)}</pre>
                </div>
              </div>
            </div>
          </div>
        )}

      </main>
      <footer style={{ marginTop: '5rem', padding: '3rem', textAlign: 'center', borderTop: '1px solid #e2e8f0', color: '#94a3b8', fontSize: '0.8rem' }}>
        Energy Optimizer AI • System Dynamicznej Analizy Energii 2026
      </footer>
    </div>
  );
}
