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

  // Zabezpieczenie searchParams dla kompatybilności z różnymi wersjami Next.js
  const resolvedParams = await Promise.resolve(searchParams || {});

  // --- WIDOK DLA NIEZALOGOWANYCH ---
  if (!userId) {
    return (
      <main style={{ padding: '0', fontFamily: 'system-ui, sans-serif', color: '#334155', backgroundColor: '#f8fafc', minHeight: '100vh' }}>
        <div style={{ padding: '8rem 2rem 6rem', textAlign: 'center', maxWidth: '900px', margin: '0 auto' }}>
          <div style={{ display: 'inline-block', padding: '6px 16px', backgroundColor: '#dcfce7', color: '#059669', borderRadius: '20px', fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '2rem', border: '1px solid #a7f3d0' }}>
            Nowość: Gotowe na taryfy dynamiczne
          </div>
          <h1 style={{ fontSize: '4.5rem', marginBottom: '1.5rem', background: 'linear-gradient(to right, #059669, #2563eb)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontWeight: '900', lineHeight: '1.1', letterSpacing: '-1px' }}>
            Zapanuj nad swoim rachunkiem za prąd
          </h1>
          <p style={{ color: '#64748b', fontSize: '1.3rem', marginBottom: '3rem', lineHeight: '1.6', maxWidth: '700px', margin: '0 auto 3rem' }}>
            Wgraj swój plik z Taurona i natychmiast dowiedz się, ile realnie kosztuje Cię prąd na giełdzie. Odkryj swój potencjał oszczędności.
          </p>
          <SignInButton mode="modal">
            {/* USUNIĘTO BŁĘDNE ZDARZENIA MYSZKI DLA SERWERA */}
            <button style={{ padding: '16px 40px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '30px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1.2rem', boxShadow: '0 10px 25px rgba(16, 185, 129, 0.3)', transition: 'transform 0.2s' }}>
              Zacznij optymalizację za darmo
            </button>
          </SignInButton>
        </div>

        <div style={{ backgroundColor: '#ffffff', padding: '5rem 2rem', borderTop: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0' }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <h2 style={{ textAlign: 'center', fontSize: '2.5rem', marginBottom: '4rem', color: '#0f172a', fontWeight: 'bold' }}>Co znajdziesz w środku?</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem' }}>
              <div style={{ padding: '2.5rem', backgroundColor: '#f8fafc', borderRadius: '24px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>📊</div>
                <h3 style={{ fontSize: '1.4rem', color: '#1e293b', marginBottom: '1rem' }}>Analityka 15-minutowa</h3>
                <p style={{ color: '#64748b', lineHeight: '1.6' }}>Łączymy Twoje dane od operatora z oficjalnymi cenami PSE. Zobaczysz dokładny koszt każdego kwadransa.</p>
              </div>
              <div style={{ padding: '2.5rem', backgroundColor: '#f8fafc', borderRadius: '24px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>💰</div>
                <h3 style={{ fontSize: '1.4rem', color: '#1e293b', marginBottom: '1rem' }}>Kalkulator oszczędności</h3>
                <p style={{ color: '#64748b', lineHeight: '1.6' }}>Nasz algorytm AI oblicza, ile gotówki odzyskasz przy optymalizacji urządzeń domowych.</p>
              </div>
              <div style={{ padding: '2.5rem', backgroundColor: '#f8fafc', borderRadius: '24px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🔮</div>
                <h3 style={{ fontSize: '1.4rem', color: '#1e293b', marginBottom: '1rem' }}>Prognoza na dziś (Premium)</h3>
                <p style={{ color: '#64748b', lineHeight: '1.6' }}>Codziennie analizujemy ceny giełdowe na bieżący dzień i mówimy Ci, kiedy dokładnie uruchomić pralkę i zmywarkę.</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // --- LOGIKA ZAKŁADEK (TABS) ---
  const activeTab = resolvedParams.tab || 'radar';
  const days = parseInt(resolvedParams.days) || 3;

  // --- LOGIKA SUBSKRYPCJI (MOCK) ---
  const isPremiumUser = true; 

  // --- 1. POBIERANIE DANYCH NA ŻYWO Z PSE (RADAR NA DZIŚ) ---
  let todayForecast = null;
  let forecastError = null; 
  
  if (activeTab === 'radar') {
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
          let minPrice = 9999;
          let maxPrice = -9999;
          let bestHour = '';
          let worstHour = '';
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
            
            if (priceKwh < minPrice) { minPrice = priceKwh; bestHour = hour; }
            if (priceKwh > maxPrice) { maxPrice = priceKwh; worstHour = hour; }
            
            pricesArr.push({ time: hour, price: priceKwh });
          });
          
          todayForecast = { minPrice, maxPrice, bestHour, worstHour, date: todayStr, prices: pricesArr };
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
    <main style={{ padding: '2rem 3rem', fontFamily: 'system-ui, sans-serif', maxWidth: '1200px', margin: '0 auto', color: '#334155', backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      
      {/* HEADER */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div style={{ fontSize: '1.4rem', fontWeight: '900', background: 'linear-gradient(to right, #059669, #2563eb)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '-0.5px' }}>
          ⚡ Energy Optimizer AI
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <span style={{ color: '#64748b', fontSize: '0.9rem', display: 'none', '@media(minWidth: 600px)': { display: 'block' } }}>Zarządzaj kontem ➔</span>
          <UserButton afterSignOutUrl="/" />
        </div>
      </header>

      {/* SYSTEM ZAKŁADEK (TABS) */}
      <div style={{ display: 'flex', gap: '2rem', borderBottom: '1px solid #e2e8f0', marginBottom: '3rem' }}>
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
                      Odblokuj za 9.99 PLN / miesiąc
                     </button>
                  </form>
                </div>
              )}

              <div style={{ backgroundColor: '#ffffff', padding: '2rem', border: '1px solid #e2e8f0', borderRadius: '24px', boxShadow: '0 10px 25px rgba(0,0,0,0.05)', userSelect: isPremiumUser ? 'auto' : 'none' }}>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
                  <div>
                    <p style={{ margin: '0 0 5px 0', color: '#64748b', fontSize: '0.9rem', textTransform: 'uppercase', fontWeight: '600' }}>🟢 Najlepszy moment na pranie</p>
                    <p style={{ margin: 0, fontSize: '2.8rem', fontWeight: '900', color: '#10b981' }}>{todayForecast.bestHour}</p>
                    <p style={{ margin: '5px 0 0 0', color: '#059669', fontSize: '0.95rem', fontWeight: '500' }}>Cena zaledwie: {todayForecast.minPrice.toFixed(2)} PLN/kWh</p>
                  </div>
                  <div style={{ borderLeft: '1px solid #e2e8f0', paddingLeft: '1.5rem' }}>
                    <p style={{ margin: '0 0 5px 0', color: '#64748b', fontSize: '0.9rem', textTransform: 'uppercase', fontWeight: '600' }}>🔴 Unikaj wysokiego zużycia</p>
                    <p style={{ margin: 0, fontSize: '2.8rem', fontWeight: '900', color: '#ef4444' }}>{todayForecast.worstHour}</p>
                    <p style={{ margin: '5px 0 0 0', color: '#b91c1c', fontSize: '0.95rem', fontWeight: '500' }}>Cena aż: {todayForecast.maxPrice.toFixed(2)} PLN/kWh</p>
                  </div>
                </div>

                <div style={{ paddingTop: '2rem', borderTop: '1px solid #e2e8f0' }}>
                  <style dangerouslySetInnerHTML={{__html: `
                    .chart-col { position: relative; cursor: crosshair; }
                    .chart-tooltip {
                      visibility: hidden;
                      opacity: 0;
                      position: absolute;
                      left: 50%;
                      transform: translateX(-50%);
                      background-color: #1e293b;
                      color: #fff;
                      padding: 8px 12px;
                      border-radius: 8px;
                      font-size: 0.8rem;
                      line-height: 1.4;
                      white-space: nowrap;
                      transition: opacity 0.2s ease, transform 0.2s ease;
                      z-index: 50;
                      pointer-events: none;
                      border: 1px solid #334155;
                      box-shadow: 0 10px 20px rgba(0,0,0,0.2);
                      text-align: center;
                    }
                    .chart-tooltip::after {
                      content: '';
                      position: absolute;
                      top: 100%;
                      left: 50%;
                      margin-left: -6px;
                      border-width: 6px;
                      border-style: solid;
                      border-color: #1e293b transparent transparent transparent;
                    }
                    .chart-col:hover .chart-tooltip {
                      visibility: visible;
                      opacity: 1;
                      transform: translateX(-50%) translateY(-5px);
                    }
                    .chart-col:hover .chart-bar-fill {
                      opacity: 1 !important;
                      filter: brightness(1.1);
                    }
                    @keyframes fadeIn {
                      from { opacity: 0; transform: translateY(10px); }
                      to { opacity: 1; transform: translateY(0); }
                    }
                  `}} />

                  <p style={{ margin: '0 0 1rem 0', color: '#64748b', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '600' }}>Wizualizacja cen w ciągu doby (PLN/kWh)</p>
                  
                  <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: '180px', paddingBottom: '10px' }}>
                    {todayForecast.prices.map((item, i) => {
                      const range = (todayForecast.maxPrice - todayForecast.minPrice) || 1;
                      const barHeight = Math.max(10, ((item.price - todayForecast.minPrice) / range) * 120);
                      const isMin = item.price === todayForecast.minPrice;
                      const isMax = item.price === todayForecast.maxPrice;
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem', flexWrap: 'wrap', gap: '1.5rem' }}>
            <div>
              <h2 style={{ fontSize: '1.8rem', color: '#0f172a', margin: 0, fontWeight: 'bold' }}>Twoja Historia Zużycia</h2>
              <p style={{ color: '#64748b', margin: '5px 0 0' }}>Analiza wgranych danych z Twojego licznika</p>
            </div>
            
            <div style={{ display: 'flex', gap: '0.2rem', backgroundColor: '#f8fafc', padding: '0.4rem', borderRadius: '30px', border: '1px solid #e2e8f0' }}>
              <Link href={`/?tab=history&days=3`} scroll={false} style={getBtnStyle(3)}>3 Dni</Link>
              <Link href={`/?tab=history&days=7`} scroll={false} style={getBtnStyle(7)}>7 Dni</Link>
              <Link href={`/?tab=history&days=30`} scroll={false} style={getBtnStyle(30)}>30 Dni</Link>
            </div>
          </div>

          <div style={{ backgroundColor: '#fff', padding: '2rem', borderRadius: '24px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', marginBottom: '2rem' }}>
             <UploadSection />
          </div>

          {chartData.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '4rem', backgroundColor: '#fff', borderRadius: '20px', border: '1px dashed #cbd5e1', marginTop: '2rem' }}>
              <h2 style={{ color: '#0f172a' }}>Brak danych w bazie</h2>
              <p style={{ color: '#64748b' }}>Użyj obszaru wyżej, aby wgrać swój plik CSV z Taurona.</p>
            </div>
          ) : (
            <div style={{ marginTop: '2rem' }}>
              <div style={{ marginBottom: '2rem', padding: '1rem 1.5rem', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
                <div>
                   <span style={{ color: '#64748b', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '600' }}>Zakres analizy:</span>
                   <p style={{ margin: 0, fontSize: '1.1rem', color: '#2563eb', fontWeight: 'bold' }}>{stats.rangeText}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                   <span style={{ color: '#64748b', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '600' }}>Ostatnie dane z licznika:</span>
                   <p style={{ margin: 0, fontSize: '1.1rem', color: '#059669', fontWeight: 'bold' }}>{stats.lastSync}</p>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
                <div style={{ padding: '2rem', backgroundColor: '#fff', borderRadius: '20px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                  <h3 style={{ margin: 0, color: '#64748b', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '600' }}>Koszt w tym okresie</h3>
                  <p style={{ margin: '15px 0 0', fontSize: '2.8rem', fontWeight: '800', color: '#0f172a' }}>{stats.cost.toFixed(2)} <span style={{fontSize: '1.2rem', color: '#94a3b8', fontWeight: 'normal'}}>PLN</span></p>
                </div>
                <div style={{ padding: '2rem', backgroundColor: '#fff', borderRadius: '20px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                  <h3 style={{ margin: 0, color: '#64748b', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '600' }}>Zużycie energii</h3>
                  <p style={{ margin: '15px 0 0', fontSize: '2.8rem', fontWeight: '800', color: '#0f172a' }}>{stats.kwh.toFixed(2)} <span style={{fontSize: '1.2rem', color: '#94a3b8', fontWeight: 'normal'}}>kWh</span></p>
                </div>
                <div style={{ padding: '2rem', backgroundColor: '#dcfce7', borderRadius: '20px', border: '1px solid #86efac', boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.1)' }}>
                  <h3 style={{ margin: 0, color: '#059669', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '600' }}>Potencjał Oszczędności</h3>
                  <p style={{ margin: '15px 0 0', fontSize: '2.8rem', fontWeight: '800', color: '#047857' }}>~ {stats.savings.toFixed(2)} <span style={{fontSize: '1.2rem', color: '#10b981', fontWeight: 'normal'}}>PLN</span></p>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
                <div style={{ padding: '1.5rem', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '16px' }}>
                  <h4 style={{ color: '#b91c1c', margin: '0 0 10px 0', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>⚠️</span> Twój historyczny wampir
                  </h4>
                  <p style={{ margin: 0, color: '#7f1d1d', lineHeight: '1.5', fontSize: '0.95rem' }}>
                    Zazwyczaj przepalałeś najwięcej pieniędzy w okolicach godziny <strong>{insights.worstHour}:00</strong>. Pilnuj tego czasu, jeśli widzisz na naszym radarze wysoką cenę prądu!
                  </p>
                </div>
              </div>

              <div style={{ backgroundColor: '#fff', padding: '2rem', borderRadius: '24px', border: '1px solid #e2e8f0', boxShadow: '0 10px 25px rgba(0,0,0,0.05)' }}>
                <h2 style={{ fontSize: '1.2rem', marginBottom: '2rem', color: '#0f172a', fontWeight: 'bold' }}>Szczegółowy profil zużycia (historyczny)</h2>
                <Chart data={chartData} />
              </div>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
