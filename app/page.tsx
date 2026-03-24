// @ts-nocheck
export const dynamic = "force-dynamic";

import { Pool } from 'pg';
import Chart from './Chart';
import Link from 'next/link';
import UploadSection from './UploadSection';
import { auth } from '@clerk/nextjs/server';
import { SignInButton, UserButton } from '@clerk/nextjs';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

export default async function Home({ searchParams }) {
  const { userId } = auth();

  const resolvedParams = await Promise.resolve(searchParams || {});

  // --- STYLE GLOBALNE RESPONSOWNE DLA URZĄDZEŃ MOBILNYCH ---
  const globalStyles = `
    .app-wrapper { padding: 2rem 3rem; }
    .hero-title { font-size: 4.5rem; }
    
    /* Klasy do obsługi Menu Desktop vs Mobile */
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
      
      /* Przełączenie na Burger Menu */
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

  // --- WIDOK DLA NIEZALOGOWANYCH (LANDING PAGE) ---
  if (!userId) {
    return (
      <div style={{ backgroundColor: '#f8fafc', minHeight: '100vh', width: '100%' }}>
        <style dangerouslySetInnerHTML={{__html: globalStyles}} />
        
        {/* MOBILNY NAGŁÓWEK DLA NIEZALOGOWANYCH */}
        <header className="app-wrapper" style={{ paddingBottom: '0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ fontSize: '1.4rem', fontWeight: '900', background: 'linear-gradient(to right, #059669, #2563eb)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '-0.5px' }}>
            ⚡ Energy Optimizer
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
            <div style={{ display: 'inline-block', padding: '6px 16px', backgroundColor: '#dcfce7', color: '#059669', borderRadius: '20px', fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '2rem', border: '1px solid #a7f3d0' }}>
              Nowość: Gotowe na taryfy dynamiczne
            </div>
            <h1 className="hero-title" style={{ marginBottom: '1.5rem', background: 'linear-gradient(to right, #059669, #2563eb)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontWeight: '900', lineHeight: '1.1', letterSpacing: '-1px' }}>
              Zapanuj nad swoim rachunkiem za prąd
            </h1>
            <p style={{ color: '#64748b', fontSize: '1.2rem', marginBottom: '3rem', lineHeight: '1.6', maxWidth: '700px', margin: '0 auto 3rem' }}>
              Wgraj swój plik z Taurona i natychmiast dowiedz się, ile realnie kosztuje Cię prąd na giełdzie. Odkryj swój potencjał oszczędności.
            </p>
            <SignInButton mode="modal">
              <button style={{ padding: '16px 40px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '30px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1.2rem', boxShadow: '0 10px 25px rgba(16, 185, 129, 0.3)', transition: 'transform 0.2s' }}>
                Zacznij optymalizację za darmo
              </button>
            </SignInButton>
          </div>

          {/* SEKCJA: DLACZEGO FORECASTING JEST WAŻNY (Z PODGLĄDEM PREMIUM) */}
          <div style={{ backgroundColor: '#ffffff', padding: '5rem 0', borderTop: '1px solid #e2e8f0' }}>
            <div className="app-wrapper mobile-flex-wrap" style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', gap: '3rem', alignItems: 'center' }}>
              
              <div style={{ flex: '1 1 300px' }}>
                <h2 style={{ fontSize: '2.5rem', color: '#0f172a', fontWeight: 'bold', marginBottom: '1.5rem', lineHeight: '1.2' }}>
                  Dlaczego intuicja to <span style={{ color: '#ef4444' }}>za mało?</span>
                </h2>
                <p style={{ color: '#475569', fontSize: '1.1rem', lineHeight: '1.7', marginBottom: '1.5rem' }}>
                  Na taryfach dynamicznych ceny prądu potrafią zmienić się diametralnie z godziny na godzinę. Są całkowicie uzależnione od pogody — wiatru i słońca.
                </p>
                <p style={{ color: '#475569', fontSize: '1.1rem', lineHeight: '1.7', marginBottom: '2rem' }}>
                  W bezchmurny weekend prąd w południe może być <strong>całkowicie darmowy</strong>. Ale wystarczy pochmurny wtorek, by wieczorne pranie kosztowało Cię 5 razy więcej niż zazwyczaj. Ręczne śledzenie tych anomalii jest uciążliwe. Nasz system analizuje giełdę za Ciebie.
                </p>
                
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                  <div style={{ padding: '1.2rem', backgroundColor: '#f8fafc', borderRadius: '16px', border: '1px solid #e2e8f0', flex: '1 1 120px' }}>
                     <div style={{ fontSize: '1.8rem', marginBottom: '5px' }}>☀️</div>
                     <span style={{ fontSize: '0.85rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 'bold' }}>Słoneczne południe</span>
                     <p style={{ fontWeight: '900', color: '#10b981', margin: '5px 0 0 0', fontSize: '1.3rem' }}>-0.05 PLN</p>
                  </div>
                  <div style={{ padding: '1.2rem', backgroundColor: '#f8fafc', borderRadius: '16px', border: '1px solid #e2e8f0', flex: '1 1 120px' }}>
                     <div style={{ fontSize: '1.8rem', marginBottom: '5px' }}>☁️</div>
                     <span style={{ fontSize: '0.85rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 'bold' }}>Pochmurny wieczór</span>
                     <p style={{ fontWeight: '900', color: '#ef4444', margin: '5px 0 0 0', fontSize: '1.3rem' }}>0.85 PLN</p>
                  </div>
                </div>
              </div>

              <div className="mobile-card-padding" style={{ flex: '1 1 300px', backgroundColor: '#f8fafc', padding: '2rem', borderRadius: '24px', border: '1px solid #e2e8f0', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' }}>
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
                 
                 {/* RESPONSIVNY KONTENER DLA MAKIETY WYKRESU (POPRAWIONE ETYKIETY) */}
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
          <div style={{ backgroundColor: '#f8fafc', padding: '5rem 0', borderTop: '1px solid #e2e8f0' }}>
            <div className="app-wrapper" style={{ maxWidth: '1200px', margin: '0 auto' }}>
              <h2 style={{ textAlign: 'center', fontSize: '2.5rem', marginBottom: '4rem', color: '#0f172a', fontWeight: 'bold' }}>Co znajdziesz w środku?</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '2rem' }}>
                <div style={{ padding: '2.5rem', backgroundColor: '#ffffff', borderRadius: '24px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>📊</div>
                  <h3 style={{ fontSize: '1.4rem', color: '#1e293b', marginBottom: '1rem' }}>Analityka 15-minutowa</h3>
                  <p style={{ color: '#64748b', lineHeight: '1.6' }}>Łączymy Twoje dane od operatora z oficjalnymi cenami PSE. Zobaczysz dokładny koszt każdego kwadransa.</p>
                </div>
                <div style={{ padding: '2.5rem', backgroundColor: '#ffffff', borderRadius: '24px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>💰</div>
                  <h3 style={{ fontSize: '1.4rem', color: '#1e293b', marginBottom: '1rem' }}>Kalkulator oszczędności</h3>
                  <p style={{ color: '#64748b', lineHeight: '1.6' }}>Nasz algorytm AI oblicza, ile gotówki odzyskasz przy optymalizacji urządzeń domowych.</p>
                </div>
                <div style={{ padding: '2.5rem', backgroundColor: '#ffffff', borderRadius: '24px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🔮</div>
                  <h3 style={{ fontSize: '1.4rem', color: '#1e293b', marginBottom: '1rem' }}>Prognoza na dziś (PRO)</h3>
                  <p style={{ color: '#64748b', lineHeight: '1.6' }}>Codziennie analizujemy ceny giełdowe na bieżący dzień i mówimy Ci, kiedy dokładnie uruchomić pralkę i zmywarkę.</p>
                </div>
                <div style={{ padding: '2.5rem', backgroundColor: '#ffffff', borderRadius: '24px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🔌</div>
                  <h3 style={{ fontSize: '1.4rem', color: '#1e293b', marginBottom: '1rem' }}>API & Smart Home</h3>
                  <p style={{ color: '#64748b', lineHeight: '1.6' }}>Podłącz system pod Home Assistant. Automatycznie uruchamiaj pompę ciepła i bojler tylko w najtańszych godzinach.</p>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const activeTab = resolvedParams.tab || 'radar';
  const days = parseInt(resolvedParams.days) || 3;

  const isPremiumUser = true; 

  let todayForecast = null;
  let forecastError = null; 
  
  if (activeTab === 'radar' || activeTab === 'api') {
    try {
      const now = new Date();
      const polandTime = new Date(now.toLocaleString("en-US", {timeZone: "Europe/Warsaw"}));
      
      const year = polandTime.getFullYear();
      const month = String(polandTime.getMonth() + 1).padStart(2, '0');
      const day = String(polandTime.getDate()).padStart(2, '0');
      const todayStr = `${year}-${month}-${day}`; 
      
      const params = new URLSearchParams({ "$filter": `business_date eq '${todayStr}'` });
      const targetUrl = `https://api.raporty.pse.pl/api/rce-pln?${params.toString()}`;
      
      const pseRes = await fetch(targetUrl, { 
        cache: 'no-store',
        headers: { 'Accept': 'application/json' }
      });
      
      if (pseRes.ok) {
        const pseJson = await pseRes.json();
        if (pseJson.value && pseJson.value.length > 0) {
          
          let pricesArr = [];
          
          pseJson.value.forEach(row => {
            const priceKwh = row.rce_pln / 1000;
            let hour = '??:??';
            const timeStr = String(row.dtime || row.udtczas || row.udtczas_oreb || row.data_czas || '');
            const timeMatch = timeStr.match(/(\d{2}:\d{2})/);
            
            if (timeMatch) { hour = timeMatch[1]; }
            else if (row.period !== undefined || row.okres !== undefined) {
              const p = parseInt(row.period || row.okres);
              if (p > 25) { 
                const h = Math.floor((p - 1) / 4);
                const m = ((p - 1) % 4) * 15;
                hour = String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
              } else { hour = String(p - 1).padStart(2, '0') + ':00'; }
            }
            else if (row.godzina !== undefined) { hour = String(row.godzina).padStart(2, '0') + ':00'; }
            
            pricesArr.push({ time: hour, price: priceKwh });
          });
          
          const isQuarterHourly = pricesArr.length > 30;
          const elementsIn3Hours = isQuarterHourly ? 12 : 3;

          let bestWindowStart = '';
          let bestWindowEnd = '';
          let bestWindowAvgPrice = 9999;

          let worstWindowStart = '';
          let worstWindowEnd = '';
          let worstWindowAvgPrice = -9999;

          const absoluteMinPrice = Math.min(...pricesArr.map(p => p.price));
          const absoluteMaxPrice = Math.max(...pricesArr.map(p => p.price));

          for (let i = 0; i <= pricesArr.length - elementsIn3Hours; i++) {
            let sum = 0;
            for (let j = 0; j < elementsIn3Hours; j++) {
              sum += pricesArr[i + j].price;
            }
            const avg = sum / elementsIn3Hours;

            if (avg < bestWindowAvgPrice) {
              bestWindowAvgPrice = avg;
              bestWindowStart = pricesArr[i].time;
              
              let endItem = pricesArr[i + elementsIn3Hours - 1]; 
              let endHour = parseInt(endItem.time.split(':')[0]);
              let endMin = parseInt(endItem.time.split(':')[1] || 0);
              
              if (isQuarterHourly) {
                  endMin += 15;
                  if (endMin >= 60) { endHour += 1; endMin = 0; }
              } else {
                  endHour += 1; 
              }
              
              if (endHour >= 24) endHour = 0;
              bestWindowEnd = `${String(endHour).padStart(2, '0')}:${String(endMin).padStart(2, '0')}`;
            }

            if (avg > worstWindowAvgPrice) {
              worstWindowAvgPrice = avg;
              worstWindowStart = pricesArr[i].time;
              
              let endItem = pricesArr[i + elementsIn3Hours - 1];
              let endHour = parseInt(endItem.time.split(':')[0]);
              let endMin = parseInt(endItem.time.split(':')[1] || 0);
              
              if (isQuarterHourly) {
                  endMin += 15;
                  if (endMin >= 60) { endHour += 1; endMin = 0; }
              } else {
                  endHour += 1;
              }
              if (endHour >= 24) endHour = 0;
              worstWindowEnd = `${String(endHour).padStart(2, '0')}:${String(endMin).padStart(2, '0')}`;
            }
          }
          
          todayForecast = { 
            bestWindowStart, bestWindowEnd, bestWindowAvgPrice, 
            worstWindowStart, worstWindowEnd, worstWindowAvgPrice,
            absoluteMinPrice, absoluteMaxPrice,
            date: todayStr, prices: pricesArr 
          };

        } else {
           forecastError = `PSE nie udostępniło jeszcze cen na dzień ${todayStr}. (Brak danych w bazie giełdy)`;
        }
      } else {
        forecastError = `Błąd API PSE (Kod: ${pseRes.status}). Odrzucono zapytanie.`;
      }
    } catch (e) {
      forecastError = "Brak odpowiedzi od serwerów PSE. Giełda może być chwilowo niedostępna.";
    }
  }

  // --- 2. DANE HISTORYCZNE Z BAZY ---
  const hoursLimit = days * 24;

  let chartData = [];
  let stats = { cost: 0, kwh: 0, savings: 0, rangeText: '', lastSync: '' };
  let insights = { worstHour: 0, worstCost: 0, bestHour: 0, bestPrice: 999 };

  if (activeTab === 'history') {
    try {
      const { rows } = await pool.query(`
        WITH hourly_prices AS (
            SELECT DATE_TRUNC('hour', timestamp) AS hour_ts, AVG(price_pln_mwh) AS price_mwh
            FROM energy_prices GROUP BY DATE_TRUNC('hour', timestamp)
      )
      SELECT c.timestamp, c.value_kwh, p.price_mwh
      FROM energy_consumption c
      JOIN hourly_prices p ON DATE_TRUNC('hour', c.timestamp) = p.hour_ts
      WHERE (c.type ILIKE '%pobór%' OR c.type ILIKE '%pobor%') 
      AND c.user_id = $1
      ORDER BY c.timestamp DESC
      LIMIT $2
    `, [userId, hoursLimit]); 

    if (rows.length > 0) {
      const latestDate = new Date(rows[0].timestamp);
      const earliestDate = new Date(rows[rows.length - 1].timestamp);
      
      stats.lastSync = latestDate.toLocaleString('pl-PL', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
      stats.rangeText = `${earliestDate.toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' })} — ${latestDate.toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' })}`;

      const hourlyAggregation = Array(24).fill(null).map(() => ({ cost: 0, priceSum: 0, count: 0 }));

      chartData = [...rows].reverse().map(row => {
        const kwh = parseFloat(row.value_kwh);
        const price = parseFloat(row.price_mwh) / 1000;
        const timestamp = new Date(row.timestamp);
        const hourOfDay = timestamp.getHours();

        hourlyAggregation[hourOfDay].cost += (kwh * price);
        hourlyAggregation[hourOfDay].priceSum += price;
        hourlyAggregation[hourOfDay].count += 1;

        return {
          time: timestamp.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' }),
          date: timestamp.toLocaleDateString('pl-PL', { month: 'short', day: 'numeric' }),
          label: timestamp.toLocaleString('pl-PL', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
          kwh: kwh,
          price: price
        };
      });

      stats.cost = chartData.reduce((sum, curr) => sum + (curr.kwh * curr.price), 0);
      stats.kwh = chartData.reduce((sum, curr) => sum + curr.kwh, 0);
      stats.savings = stats.cost * 0.115;

      hourlyAggregation.forEach((data, hour) => {
        if (data.count > 0) {
          if (data.cost > insights.worstCost) {
            insights.worstCost = data.cost;
            insights.worstHour = hour;
          }
          const avgPrice = data.priceSum / data.count;
          if (avgPrice < insights.bestPrice) {
            insights.bestPrice = avgPrice;
            insights.bestHour = hour;
          }
        }
      });
    }
      
    } catch (error) {
      console.error("Błąd bazy danych:", error);
    }
  }

  const getBtnStyle = (btnDays) => ({
    padding: '8px 20px',
    backgroundColor: days === btnDays ? '#10b981' : '#f1f5f9',
    color: days === btnDays ? '#fff' : '#64748b',
    borderRadius: '20px',
    textDecoration: 'none',
    fontWeight: '600',
    fontSize: '0.9rem',
    transition: 'all 0.2s ease',
    border: days === btnDays ? '1px solid #10b981' : '1px solid #e2e8f0',
  });

  return (
    <div style={{ backgroundColor: '#f8fafc', minHeight: '100vh', width: '100%' }}>
      <style dangerouslySetInnerHTML={{__html: globalStyles}} />
      <main className="app-wrapper" style={{ fontFamily: 'system-ui, sans-serif', maxWidth: '1200px', margin: '0 auto', color: '#334155' }}>
        
        {/* HEADER */}
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div style={{ fontSize: '1.4rem', fontWeight: '900', background: 'linear-gradient(to right, #059669, #2563eb)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '-0.5px' }}>
            ⚡ Energy Optimizer AI
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <span className="hide-on-mobile" style={{ color: '#64748b', fontSize: '0.9rem' }}>Zarządzaj kontem ➔</span>
            <UserButton afterSignOutUrl="/" />
          </div>
        </header>

        {/* SYSTEM ZAKŁADEK (TABS) - WERSJA DESKTOP */}
        <div className="desktop-tabs">
          <Link 
            href={`/?tab=radar&days=${days}`} 
            scroll={false} 
            style={{ 
              padding: '0.8rem 0', 
              color: activeTab === 'radar' ? '#0f172a' : '#64748b', 
              borderBottom: activeTab === 'radar' ? '2px solid #10b981' : '2px solid transparent',
              textDecoration: 'none',
              fontWeight: '600',
              fontSize: '1.1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            Radar na dziś
            <span style={{ backgroundColor: '#10b981', color: '#fff', fontSize: '0.65rem', padding: '2px 6px', borderRadius: '8px', fontWeight: 'bold' }}>PRO</span>
          </Link>
          <Link 
            href={`/?tab=history&days=${days}`} 
            scroll={false} 
            style={{ 
              padding: '0.8rem 0', 
              color: activeTab === 'history' ? '#0f172a' : '#64748b', 
              borderBottom: activeTab === 'history' ? '2px solid #3b82f6' : '2px solid transparent',
              textDecoration: 'none',
              fontWeight: '600',
              fontSize: '1.1rem'
            }}
          >
            Profil Historyczny
          </Link>
          <Link 
            href={`/?tab=api&days=${days}`} 
            scroll={false} 
            style={{ 
              padding: '0.8rem 0', 
              color: activeTab === 'api' ? '#0f172a' : '#64748b', 
              borderBottom: activeTab === 'api' ? '2px solid #a855f7' : '2px solid transparent',
              textDecoration: 'none',
              fontWeight: '600',
              fontSize: '1.1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginLeft: 'auto'
            }}
          >
            Automatyzacje API
            <span style={{ backgroundColor: '#a855f7', color: '#fff', fontSize: '0.65rem', padding: '2px 6px', borderRadius: '8px', fontWeight: 'bold' }}>LIVE</span>
          </Link>
        </div>

        {/* SYSTEM ZAKŁADEK (BURGER MENU) - WERSJA MOBILNA */}
        <div className="mobile-menu-container">
          <details className="mobile-nav" style={{ width: '100%' }}>
            <summary style={{ backgroundColor: '#fff', padding: '1rem 1.5rem', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 'bold', color: '#0f172a', cursor: 'pointer' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '1.2rem' }}>☰</span> 
                Menu: {activeTab === 'radar' ? 'Radar na dziś' : activeTab === 'history' ? 'Profil Historyczny' : 'Automatyzacje API'}
              </div>
              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>▼</span>
            </summary>
            <div style={{ position: 'absolute', top: '100%', left: '0', right: '0', backgroundColor: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', marginTop: '0.5rem', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <Link href={`/?tab=radar&days=${days}`} scroll={false} style={{ padding: '1.2rem 1.5rem', borderBottom: '1px solid #f1f5f9', textDecoration: 'none', color: activeTab === 'radar' ? '#10b981' : '#334155', fontWeight: activeTab === 'radar' ? 'bold' : 'normal', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                Radar na dziś
                <span style={{ backgroundColor: '#10b981', color: '#fff', fontSize: '0.65rem', padding: '2px 6px', borderRadius: '8px', fontWeight: 'bold' }}>PRO</span>
              </Link>
              <Link href={`/?tab=history&days=${days}`} scroll={false} style={{ padding: '1.2rem 1.5rem', borderBottom: '1px solid #f1f5f9', textDecoration: 'none', color: activeTab === 'history' ? '#3b82f6' : '#334155', fontWeight: activeTab === 'history' ? 'bold' : 'normal' }}>
                Profil Historyczny
              </Link>
              <Link href={`/?tab=api&days=${days}`} scroll={false} style={{ padding: '1.2rem 1.5rem', textDecoration: 'none', color: activeTab === 'api' ? '#a855f7' : '#334155', fontWeight: activeTab === 'api' ? 'bold' : 'normal', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                Automatyzacje API
                <span style={{ backgroundColor: '#a855f7', color: '#fff', fontSize: '0.65rem', padding: '2px 6px', borderRadius: '8px', fontWeight: 'bold' }}>LIVE</span>
              </Link>
            </div>
          </details>
        </div>
        
        {/* ========================================= */}
        {/* SEKCJA 1: RADAR NA DZIŚ (Z PAYWALLEM) */}
        {/* ========================================= */}
        {activeTab === 'radar' && (
          <div style={{ marginBottom: '3rem', animation: 'fadeIn 0.3s ease' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ backgroundColor: '#fef08a', color: '#854d0e', padding: '4px 10px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>Funkcja Premium</span>
                <h2 style={{ margin: 0, fontSize: '1.8rem', color: '#0f172a' }}>Plan na dziś</h2>
              </div>
              {todayForecast && (
                <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem' }}>
                  📅 Dane PSE na dzień: <strong>{todayForecast.date.split('-').reverse().join('.')}</strong>
                </p>
              )}
            </div>

            {todayForecast ? (
              <div style={{ position: 'relative', borderRadius: '24px', overflow: 'hidden' }}>
                
                {!isPremiumUser && (
                  <div style={{ 
                    position: 'absolute', 
                    inset: 0, 
                    backgroundColor: 'rgba(255, 255, 255, 0.7)', 
                    backdropFilter: 'blur(10px)', 
                    WebkitBackdropFilter: 'blur(10px)',
                    zIndex: 10, 
                    display: 'flex', 
                    flexDirection: 'column',
                    justifyContent: 'center', 
                    alignItems: 'center',
                    padding: '2rem',
                    textAlign: 'center'
                  }}>
                    <h3 style={{ fontSize: '1.8rem', marginBottom: '1rem', color: '#0f172a', fontWeight: 'bold' }}>Odblokuj codzienne radary oszczędności</h3>
                    <p style={{ color: '#475569', maxWidth: '500px', marginBottom: '2rem', lineHeight: '1.5' }}>
                      Zarabiaj na ujemnych cenach prądu i unikaj najdroższych godzin. Uzyskaj dostęp do prognoz na żywo i zacznij realnie obniżać rachunki.
                    </p>
                    <form action="/api/checkout_sessions" method="POST">
                       <button type="submit" style={{ padding: '16px 40px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '30px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1.1rem', boxShadow: '0 10px 25px rgba(16, 185, 129, 0.4)' }}>
                        Odblokuj za 14.99 PLN / miesiąc
                       </button>
                    </form>
                  </div>
                )}

                <div className="mobile-card-padding" style={{ backgroundColor: '#ffffff', padding: '2rem', border: '1px solid #e2e8f0', borderRadius: '24px', boxShadow: '0 10px 25px rgba(0,0,0,0.05)', userSelect: isPremiumUser ? 'auto' : 'none' }}>
                  
                  <div className="mobile-col" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
                    <div>
                      <p style={{ margin: '0 0 5px 0', color: '#64748b', fontSize: '0.9rem', textTransform: 'uppercase', fontWeight: '600' }}>🟢 Najtańsze okno (3 godz.)</p>
                      <p style={{ margin: 0, fontSize: '2.5rem', fontWeight: '900', color: '#10b981', whiteSpace: 'nowrap' }}>
                         {todayForecast.bestWindowStart} - {todayForecast.bestWindowEnd}
                      </p>
                      <p style={{ margin: '5px 0 0 0', color: '#059669', fontSize: '0.95rem', fontWeight: '500' }}>
                         Średnia cena: {todayForecast.bestWindowAvgPrice.toFixed(2)} PLN/kWh
                      </p>
                    </div>
                    <div className="mobile-border-left-none" style={{ borderLeft: '1px solid #e2e8f0', paddingLeft: '1.5rem' }}>
                      <p style={{ margin: '0 0 5px 0', color: '#64748b', fontSize: '0.9rem', textTransform: 'uppercase', fontWeight: '600' }}>🔴 Unikaj dużego zużycia</p>
                      <p style={{ margin: 0, fontSize: '2.5rem', fontWeight: '900', color: '#ef4444', whiteSpace: 'nowrap' }}>
                         {todayForecast.worstWindowStart} - {todayForecast.worstWindowEnd}
                      </p>
                      <p style={{ margin: '5px 0 0 0', color: '#b91c1c', fontSize: '0.95rem', fontWeight: '500' }}>
                         Średnia cena aż: {todayForecast.worstWindowAvgPrice.toFixed(2)} PLN/kWh
                      </p>
                    </div>
                  </div>

                  <div style={{ paddingTop: '2rem', borderTop: '1px solid #e2e8f0' }}>
                    <p style={{ margin: '0 0 1rem 0', color: '#64748b', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '600' }}>Wizualizacja cen w ciągu doby (PLN/kWh)</p>
                    
                    {/* RESPONSIVNY KONTENER WYKRESU */}
                    <div className="chart-scroll-box">
                      <div className="chart-flex-box" style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: '180px', paddingBottom: '10px' }}>
                        {todayForecast.prices.map((item, i) => {
                          const range = (todayForecast.absoluteMaxPrice - todayForecast.absoluteMinPrice) || 1;
                          const barHeight = Math.max(10, ((item.price - todayForecast.absoluteMinPrice) / range) * 120);
                          const isMin = item.price === todayForecast.absoluteMinPrice;
                          const isMax = item.price === todayForecast.absoluteMaxPrice;
                          const isFullHour = item.time.endsWith('00');
                          
                          return (
                            <div key={i} className="chart-col" style={{ flex: '1', display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
                              <span style={{ fontSize: '0.65rem', fontWeight: 'bold', color: isMin ? '#10b981' : isMax ? '#ef4444' : 'transparent', marginBottom: '4px', display: 'block', minHeight: '15px' }}>
                                {isMin || isMax ? item.price.toFixed(2) : ''}
                              </span>
                              <div className="chart-bar-fill" style={{ width: '90%', maxWidth: '8px', minWidth: '2px', height: `${barHeight}px`, backgroundColor: isMin ? '#10b981' : isMax ? '#ef4444' : '#cbd5e1', borderRadius: '2px 2px 0 0', opacity: isMin || isMax ? 1 : 0.7, transition: 'opacity 0.2s, filter 0.2s' }}></div>
                              <div className="chart-tooltip" style={{ bottom: `calc(${barHeight}px + 26px)` }}>
                                <strong style={{ color: isMin ? '#34d399' : isMax ? '#fca5a5' : '#93c5fd' }}>{item.time}</strong><br/>
                                {item.price.toFixed(2)} PLN
                              </div>
                              <span style={{ fontSize: '0.6rem', marginTop: '4px', display: 'block', minHeight: '14px', color: isFullHour && parseInt(item.time.split(':')[0]) % 4 === 0 ? '#94a3b8' : 'transparent' }}>
                                {item.time.split(':')[0]}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid #e2e8f0' }}>
                    <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0, fontStyle: 'italic' }}>
                      * Ceny na kolejny dzień publikowane są przez PSE codziennie ok. godziny 14:00.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ padding: '2rem', backgroundColor: '#fff', borderRadius: '20px', border: '1px solid #e2e8f0', color: '#334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                <div>
                  <p style={{ margin: '0 0 5px 0', fontWeight: 'bold', color: '#ef4444' }}>⚠️ Wystąpił problem z pobraniem danych</p>
                  <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem' }}>{forecastError || "Ładowanie najnowszych cen giełdowych PSE..."}</p>
                </div>
                <a href="/?tab=radar" style={{ padding: '10px 20px', backgroundColor: '#f1f5f9', color: '#0f172a', textDecoration: 'none', borderRadius: '8px', fontWeight: 'bold', border: '1px solid #cbd5e1' }}>
                  Spróbuj ponownie 🔄
                </a>
              </div>
            )}
          </div>
        )}

        {/* ========================================= */}
        {/* SEKCJA 2: LUSTERKO WSTECZNE (HISTORIA) */}
        {/* ========================================= */}
        {activeTab === 'history' && (
          <div style={{ animation: 'fadeIn 0.3s ease' }}>
            <div className="mobile-col" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem', flexWrap: 'wrap', gap: '1.5rem' }}>
              <div>
                <h2 style={{ fontSize: '1.8rem', color: '#0f172a', margin: 0, fontWeight: 'bold' }}>Twoja Historia Zużycia</h2>
                <p style={{ color: '#64748b', margin: '5px 0 0' }}>Analiza wgranych danych z Twojego licznika</p>
              </div>
              
              <div style={{ display: 'flex', gap: '0.2rem', backgroundColor: '#f8fafc', padding: '0.4rem', borderRadius: '30px', border: '1px solid #e2e8f0', width: 'max-content' }}>
                <Link href={`/?tab=history&days=3`} scroll={false} style={getBtnStyle(3)}>3 Dni</Link>
                <Link href={`/?tab=history&days=7`} scroll={false} style={getBtnStyle(7)}>7 Dni</Link>
                <Link href={`/?tab=history&days=30`} scroll={false} style={getBtnStyle(30)}>30 Dni</Link>
              </div>
            </div>

            {chartData.length === 0 ? (
              <>
                <div className="mobile-card-padding" style={{ backgroundColor: '#fff', padding: '2rem', borderRadius: '24px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', marginBottom: '2rem' }}>
                   <UploadSection />
                </div>
                <div className="mobile-card-padding" style={{ textAlign: 'center', padding: '4rem', backgroundColor: '#fff', borderRadius: '20px', border: '1px dashed #cbd5e1', marginTop: '2rem' }}>
                  <h2 style={{ color: '#0f172a' }}>Brak danych w bazie</h2>
                  <p style={{ color: '#64748b' }}>Użyj obszaru wyżej, aby wgrać swój plik CSV z Taurona.</p>
                </div>
              </>
            ) : (
              <div style={{ marginTop: '2rem' }}>
                
                {/* UKRYTY UPLOAD DANYCH (Rozwijany) */}
                <details className="mobile-card-padding" style={{ backgroundColor: '#fff', padding: '1.2rem 1.5rem', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', marginBottom: '2rem', cursor: 'pointer' }}>
                  <summary style={{ fontWeight: '600', color: '#3b82f6', fontSize: '1.05rem', outline: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>⚙️</span> Zaktualizuj dane (wgraj nowy plik CSV)
                  </summary>
                  <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid #e2e8f0', cursor: 'default' }}>
                    <UploadSection />
                  </div>
                </details>

                <div className="mobile-col" style={{ marginBottom: '2rem', padding: '1rem 1.5rem', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
                  <div>
                     <span style={{ color: '#64748b', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '600' }}>Zakres analizy:</span>
                     <p style={{ margin: 0, fontSize: '1.1rem', color: '#2563eb', fontWeight: 'bold' }}>{stats.rangeText}</p>
                  </div>
                  <div style={{ textAlign: 'right' }} className="mobile-text-center">
                     <span style={{ color: '#64748b', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '600' }}>Ostatnie dane z licznika:</span>
                     <p style={{ margin: 0, fontSize: '1.1rem', color: '#059669', fontWeight: 'bold' }}>{stats.lastSync}</p>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
                  <div className="mobile-card-padding" style={{ padding: '2rem', backgroundColor: '#fff', borderRadius: '20px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                    <h3 style={{ margin: 0, color: '#64748b', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '600' }}>Koszt w tym okresie</h3>
                    <p style={{ margin: '15px 0 0', fontSize: '2.8rem', fontWeight: '800', color: '#0f172a' }}>{stats.cost.toFixed(2)} <span style={{fontSize: '1.2rem', color: '#94a3b8', fontWeight: 'normal'}}>PLN</span></p>
                  </div>
                  <div className="mobile-card-padding" style={{ padding: '2rem', backgroundColor: '#fff', borderRadius: '20px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                    <h3 style={{ margin: 0, color: '#64748b', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '600' }}>Zużycie energii</h3>
                    <p style={{ margin: '15px 0 0', fontSize: '2.8rem', fontWeight: '800', color: '#0f172a' }}>{stats.kwh.toFixed(2)} <span style={{fontSize: '1.2rem', color: '#94a3b8', fontWeight: 'normal'}}>kWh</span></p>
                  </div>
                  
                  <div className="mobile-card-padding" style={{ padding: '2rem', backgroundColor: '#dcfce7', borderRadius: '20px', border: '1px solid #86efac', boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.1)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <h3 style={{ margin: 0, color: '#059669', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '600' }}>Potencjał Oszczędności</h3>
                    <p style={{ margin: '15px 0 10px 0', fontSize: '2.8rem', fontWeight: '800', color: '#047857' }}>~ {stats.savings.toFixed(2)} <span style={{fontSize: '1.2rem', color: '#10b981', fontWeight: 'normal'}}>PLN</span></p>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: '#065f46', lineHeight: '1.4' }}>
                      Szacowana kwota, którą zatrzymasz w portfelu, uruchamiając pralkę lub zmywarkę tylko w najtańszych "zielonych oknach" z naszego radaru.
                    </p>
                  </div>

                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
                  <div className="mobile-card-padding" style={{ padding: '1.5rem', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '16px' }}>
                    <h4 style={{ color: '#b91c1c', margin: '0 0 10px 0', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span>⚠️</span> Twój historyczny wampir
                    </h4>
                    <p style={{ margin: 0, color: '#7f1d1d', lineHeight: '1.5', fontSize: '0.95rem' }}>
                      Zazwyczaj przepalałeś najwięcej pieniędzy w okolicach godziny <strong>{insights.worstHour}:00</strong>. Pilnuj tego czasu, jeśli widzisz na naszym radarze wysoką cenę prądu!
                    </p>
                  </div>
                </div>

                <div className="mobile-card-padding" style={{ backgroundColor: '#fff', padding: '2rem', borderRadius: '24px', border: '1px solid #e2e8f0', boxShadow: '0 10px 25px rgba(0,0,0,0.05)' }}>
                  <h2 style={{ fontSize: '1.2rem', marginBottom: '2rem', color: '#0f172a', fontWeight: 'bold' }}>Szczegółowy profil zużycia (historyczny)</h2>
                  <Chart data={chartData} />
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================= */}
        {/* SEKCJA 3: ZAKŁADKA API & SMART HOME (LIVE) */}
        {/* ========================================= */}
        {activeTab === 'api' && (
          <div style={{ animation: 'fadeIn 0.3s ease' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.5rem' }}>
              <span style={{ backgroundColor: '#f3e8ff', color: '#7e22ce', padding: '4px 10px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>Dla zaawansowanych</span>
              <h2 style={{ margin: 0, fontSize: '1.8rem', color: '#0f172a' }}>Integracja Home Assistant</h2>
            </div>
            
            <div className="mobile-card-padding" style={{ backgroundColor: '#ffffff', padding: '3rem', border: '1px solid #e2e8f0', borderRadius: '24px', boxShadow: '0 10px 25px rgba(0,0,0,0.05)' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3rem', alignItems: 'flex-start' }}>
                <div style={{ flex: '1 1 350px' }}>
                  <h3 style={{ fontSize: '1.8rem', color: '#0f172a', fontWeight: 'bold', marginBottom: '1rem' }}>API jest już gotowe do działania!</h3>
                  <p style={{ color: '#475569', fontSize: '1.1rem', lineHeight: '1.7', marginBottom: '1.5rem' }}>
                    Pobieraj nasze wyliczenia bezpośrednio do swojego Home Assistanta. Zautomatyzuj ogrzewanie i ładuj urządzenia dokładnie wtedy, gdy prąd kosztuje najmniej.
                  </p>
                  
                  {/* SEKRETNY KLUCZ API */}
                  <div style={{ backgroundColor: '#f8fafc', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '2rem' }}>
                    <h4 style={{ margin: '0 0 10px 0', fontSize: '1rem', color: '#0f172a' }}>Klucz autoryzacyjny (API Key)</h4>
                    <p style={{ fontSize: '0.9rem', color: '#64748b', marginBottom: '10px' }}>Zabezpiecz swoje zapytania, używając nagłówka: <code>Authorization: Bearer</code></p>
                    <code style={{ display: 'block', backgroundColor: '#e2e8f0', padding: '12px', borderRadius: '8px', color: '#334155', fontWeight: 'bold', userSelect: 'all', fontSize: '1rem' }}>
                      demo_premium_key_123
                    </code>
                  </div>

                  {/* KOD YAML DLA HA */}
                  <h4 style={{ margin: '0 0 10px 0', fontSize: '1rem', color: '#0f172a' }}>Gotowy kod dla Home Assistanta (configuration.yaml):</h4>
                  <pre style={{ backgroundColor: '#0f172a', color: '#e2e8f0', padding: '1.5rem', borderRadius: '12px', fontSize: '0.85rem', overflowX: 'auto', lineHeight: '1.5', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.5)' }}>
{`rest:
  - resource: "https://twoja-domena.vercel.app/api/v1/forecast/best-window"
    headers:
      Authorization: "Bearer demo_premium_key_123"
    sensor:
      - name: "Energy Best Window Start"
        value_template: "{{ value_json.recommended_start }}"
      - name: "Energy Best Window Avg Price"
        value_template: "{{ value_json.avg_price_pln }}"
        unit_of_measurement: "PLN/kWh"`}
                  </pre>
                </div>
                
                {/* WIZUALIZACJA ODPOWIEDZI JSON */}
                <div className="chart-scroll-box" style={{ flex: '1 1 350px', backgroundColor: '#0f172a', borderRadius: '16px', padding: '1.5rem', fontFamily: 'monospace', color: '#e2e8f0', fontSize: '0.9rem', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)' }}>
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '1rem' }}>
                    <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#ef4444' }}></div>
                    <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#eab308' }}></div>
                    <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#10b981' }}></div>
                  </div>
                  <div style={{ color: '#a855f7', marginBottom: '8px', fontWeight: 'bold' }}>GET /api/v1/forecast/best-window</div>
                  <p style={{ color: '#94a3b8', fontSize: '0.75rem', marginBottom: '15px' }}>Przykładowa odpowiedź serwera (JSON):</p>
                  
                  <div style={{ paddingLeft: '1rem', borderLeft: '2px solid #334155', minWidth: '350px' }}>
                    {"{"}<br/>
                    &nbsp;&nbsp;<span style={{ color: '#38bdf8' }}>"status"</span>: <span style={{ color: '#a3e635' }}>"success"</span>,<br/>
                    &nbsp;&nbsp;<span style={{ color: '#38bdf8' }}>"device_type"</span>: <span style={{ color: '#a3e635' }}>"heat_pump_or_ev"</span>,<br/>
                    &nbsp;&nbsp;<span style={{ color: '#38bdf8' }}>"recommended_start"</span>: <span style={{ color: '#a3e635' }}>"{todayForecast ? todayForecast.bestWindowStart : '11:00'}"</span>,<br/>
                    &nbsp;&nbsp;<span style={{ color: '#38bdf8' }}>"recommended_end"</span>: <span style={{ color: '#a3e635' }}>"{todayForecast ? todayForecast.bestWindowEnd : '14:00'}"</span>,<br/>
                    &nbsp;&nbsp;<span style={{ color: '#38bdf8' }}>"avg_price_pln"</span>: <span style={{ color: '#f87171' }}>{todayForecast ? todayForecast.bestWindowAvgPrice.toFixed(4) : '-0.0500'}</span>,<br/>
                    &nbsp;&nbsp;<span style={{ color: '#38bdf8' }}>"trigger_automation"</span>: <span style={{ color: '#fbbf24' }}>true</span><br/>
                    {"}"}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
