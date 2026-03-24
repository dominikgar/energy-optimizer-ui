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

  // --- WIDOK DLA NIEZALOGOWANYCH ---
  if (!userId) {
    return (
      <main style={{ padding: '0', fontFamily: 'system-ui, sans-serif', color: '#eaeaea', backgroundColor: '#0a0a0a', minHeight: '100vh' }}>
        <div style={{ padding: '8rem 2rem 6rem', textAlign: 'center', maxWidth: '900px', margin: '0 auto' }}>
          <div style={{ display: 'inline-block', padding: '6px 16px', backgroundColor: '#1a2e1a', color: '#34d399', borderRadius: '20px', fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '2rem', border: '1px solid #2d5a2d' }}>
            Nowość: Gotowe na taryfy dynamiczne
          </div>
          <h1 style={{ fontSize: '4.5rem', marginBottom: '1.5rem', background: 'linear-gradient(to right, #10b981, #3b82f6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontWeight: '900', lineHeight: '1.1', letterSpacing: '-1px' }}>
            Zapanuj nad swoim rachunkiem za prąd
          </h1>
          <p style={{ color: '#a1a1aa', fontSize: '1.3rem', marginBottom: '3rem', lineHeight: '1.6', maxWidth: '700px', margin: '0 auto 3rem' }}>
            Wgraj swój plik z Taurona i natychmiast dowiedz się, ile realnie kosztuje Cię prąd na giełdzie. Odkryj swój potencjał oszczędności.
          </p>
          <SignInButton mode="modal">
            <button style={{ padding: '16px 40px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '30px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1.2rem', boxShadow: '0 10px 25px rgba(16, 185, 129, 0.4)' }}>
              Zacznij optymalizację za darmo
            </button>
          </SignInButton>
        </div>

        <div style={{ backgroundColor: '#111', padding: '5rem 2rem', borderTop: '1px solid #222', borderBottom: '1px solid #222' }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <h2 style={{ textAlign: 'center', fontSize: '2.5rem', marginBottom: '4rem', color: '#fff', fontWeight: 'bold' }}>Co znajdziesz w środku?</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem' }}>
              <div style={{ padding: '2.5rem', backgroundColor: '#18181b', borderRadius: '24px', border: '1px solid #27272a' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>📊</div>
                <h3 style={{ fontSize: '1.4rem', color: '#e4e4e7', marginBottom: '1rem' }}>Analityka 15-minutowa</h3>
                <p style={{ color: '#a1a1aa', lineHeight: '1.6' }}>Łączymy Twoje dane od operatora z oficjalnymi cenami PSE. Zobaczysz dokładny koszt każdego kwadransa.</p>
              </div>
              <div style={{ padding: '2.5rem', backgroundColor: '#18181b', borderRadius: '24px', border: '1px solid #27272a' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>💰</div>
                <h3 style={{ fontSize: '1.4rem', color: '#e4e4e7', marginBottom: '1rem' }}>Kalkulator oszczędności</h3>
                <p style={{ color: '#a1a1aa', lineHeight: '1.6' }}>Nasz algorytm AI oblicza, ile gotówki odzyskasz przy optymalizacji urządzeń domowych.</p>
              </div>
              <div style={{ padding: '2.5rem', backgroundColor: '#18181b', borderRadius: '24px', border: '1px solid #27272a' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🔮</div>
                <h3 style={{ fontSize: '1.4rem', color: '#e4e4e7', marginBottom: '1rem' }}>Prognoza na dziś (Premium)</h3>
                <p style={{ color: '#a1a1aa', lineHeight: '1.6' }}>Codziennie analizujemy ceny giełdowe na bieżący dzień i mówimy Ci, kiedy dokładnie uruchomić pralkę i zmywarkę.</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // --- LOGIKA SUBSKRYPCJI (MOCK) ---
  const isPremiumUser = true; 

  // --- 1. POBIERANIE DANYCH NA ŻYWO Z PSE (RADAR NA DZIŚ) ---
  let todayForecast = null;
  let forecastError = null; 
  
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

  // --- 2. DANE HISTORYCZNE Z BAZY ---
  const days = parseInt(searchParams?.days) || 3;
  const hoursLimit = days * 24;

  let chartData = [];
  let stats = { cost: 0, kwh: 0, savings: 0 };
  let insights = { worstHour: 0, worstCost: 0, bestHour: 0, bestPrice: 999 };

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

    const hourlyAggregation = Array(24).fill(null).map(() => ({ cost: 0, priceSum: 0, count: 0 }));

    chartData = rows.reverse().map(row => {
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
    
  } catch (error) {
    console.error("Błąd bazy danych:", error);
  }

  const getBtnStyle = (btnDays) => ({
    padding: '8px 20px',
    backgroundColor: days === btnDays ? '#10b981' : 'transparent',
    color: days === btnDays ? '#fff' : '#aaa',
    borderRadius: '20px',
    textDecoration: 'none',
    fontWeight: '600',
    fontSize: '0.9rem',
    transition: 'all 0.2s ease',
  });

  return (
    <main style={{ padding: '2rem 3rem', fontFamily: 'system-ui, sans-serif', maxWidth: '1200px', margin: '0 auto', color: '#eaeaea', backgroundColor: '#0a0a0a', minHeight: '100vh' }}>
      
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem', paddingBottom: '1.5rem', borderBottom: '1px solid #222' }}>
        <div style={{ fontSize: '1.4rem', fontWeight: '900', background: 'linear-gradient(to right, #10b981, #3b82f6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '-0.5px' }}>
          ⚡ Energy Optimizer AI
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <span style={{ color: '#888', fontSize: '0.9rem', display: 'none', '@media(minWidth: 600px)': { display: 'block' } }}>Zarządzaj kontem ➔</span>
          <UserButton afterSignOutUrl="/" />
        </div>
      </header>
      
      {/* SEKCJA 1: RADAR NA DZIŚ (Z PAYWALLEM) */}
      <div style={{ marginBottom: '3rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.5rem' }}>
          <span style={{ backgroundColor: '#eab308', color: '#422006', padding: '4px 10px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>Funkcja Premium</span>
          <h2 style={{ margin: 0, fontSize: '1.8rem', color: '#fff' }}>Plan na dziś ({new Date().toLocaleDateString('pl-PL')})</h2>
        </div>

        {todayForecast ? (
          <div style={{ position: 'relative', borderRadius: '24px', overflow: 'hidden' }}>
            
            {!isPremiumUser && (
              <div style={{ 
                position: 'absolute', 
                inset: 0, 
                backgroundColor: 'rgba(10, 10, 10, 0.7)', 
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
                <h3 style={{ fontSize: '1.8rem', marginBottom: '1rem', color: '#fff', fontWeight: 'bold' }}>Odblokuj codzienne radary oszczędności</h3>
                <p style={{ color: '#a1a1aa', maxWidth: '500px', marginBottom: '2rem', lineHeight: '1.5' }}>
                  Zarabiaj na ujemnych cenach prądu i unikaj najdroższych godzin. Uzyskaj dostęp do prognoz na żywo i zacznij realnie obniżać rachunki.
                </p>
                <form action="/api/checkout_sessions" method="POST">
                   <button type="submit" style={{ padding: '16px 40px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '30px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1.1rem', boxShadow: '0 10px 25px rgba(16, 185, 129, 0.4)' }}>
                    Odblokuj za 9.99 PLN / miesiąc
                   </button>
                </form>
              </div>
            )}

            <div style={{ background: 'linear-gradient(145deg, #18181b, #0f0f11)', padding: '2rem', border: '1px solid #333', boxShadow: '0 15px 35px rgba(0,0,0,0.4)', userSelect: isPremiumUser ? 'auto' : 'none' }}>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
                <div>
                  <p style={{ margin: '0 0 5px 0', color: '#a1a1aa', fontSize: '0.9rem', textTransform: 'uppercase' }}>🟢 Najlepszy moment na pranie</p>
                  <p style={{ margin: 0, fontSize: '2.5rem', fontWeight: '900', color: '#10b981' }}>{todayForecast.bestHour}</p>
                  <p style={{ margin: '5px 0 0 0', color: '#6ee7b7', fontSize: '0.9rem' }}>Cena zaledwie: {todayForecast.minPrice.toFixed(2)} PLN/kWh</p>
                </div>
                <div style={{ borderLeft: '1px solid #333', paddingLeft: '1.5rem' }}>
                  <p style={{ margin: '0 0 5px 0', color: '#a1a1aa', fontSize: '0.9rem', textTransform: 'uppercase' }}>🔴 Unikaj wysokiego zużycia</p>
                  <p style={{ margin: 0, fontSize: '2.5rem', fontWeight: '900', color: '#ef4444' }}>{todayForecast.worstHour}</p>
                  <p style={{ margin: '5px 0 0 0', color: '#fca5a5', fontSize: '0.9rem' }}>Cena aż: {todayForecast.maxPrice.toFixed(2)} PLN/kWh</p>
                </div>
              </div>

              {/* HEATMAPA Z WBUDOWANYMI CSS-OWYMI TOOLTIPAMI */}
              <div style={{ paddingTop: '1.5rem', borderTop: '1px solid #222' }}>
                
                {/* Style dla płynnego interaktywnego podświetlania i tooltipów */}
                <style dangerouslySetInnerHTML={{__html: `
                  .chart-col { position: relative; cursor: crosshair; }
                  .chart-tooltip {
                    visibility: hidden;
                    opacity: 0;
                    position: absolute;
                    left: 50%;
                    transform: translateX(-50%);
                    background-color: #27272a;
                    color: #fff;
                    padding: 8px 12px;
                    border-radius: 8px;
                    font-size: 0.8rem;
                    line-height: 1.4;
                    white-space: nowrap;
                    transition: opacity 0.2s ease, transform 0.2s ease;
                    z-index: 50;
                    pointer-events: none;
                    border: 1px solid #3f3f46;
                    box-shadow: 0 10px 20px rgba(0,0,0,0.6);
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
                    border-color: #3f3f46 transparent transparent transparent;
                  }
                  .chart-col:hover .chart-tooltip {
                    visibility: visible;
                    opacity: 1;
                    transform: translateX(-50%) translateY(-5px);
                  }
                  .chart-col:hover .chart-bar-fill {
                    opacity: 1 !important;
                    filter: brightness(1.4);
                  }
                `}} />

                <p style={{ margin: '0 0 1rem 0', color: '#888', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Wizualizacja cen w ciągu doby (PLN/kWh)</p>
                
                <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: '180px', paddingBottom: '10px' }}>
                  {todayForecast.prices.map((item, i) => {
                    const range = (todayForecast.maxPrice - todayForecast.minPrice) || 1;
                    const barHeight = Math.max(10, ((item.price - todayForecast.minPrice) / range) * 120);
                    const isMin = item.price === todayForecast.minPrice;
                    const isMax = item.price === todayForecast.maxPrice;
                    const isFullHour = item.time.endsWith('00');
                    
                    return (
                      <div key={i} className="chart-col" style={{ flex: '1', display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
                        
                        <span style={{ 
                          fontSize: '0.65rem', 
                          fontWeight: 'bold', 
                          color: isMin ? '#10b981' : isMax ? '#ef4444' : 'transparent', 
                          marginBottom: '4px',
                          display: 'block',
                          minHeight: '15px' 
                        }}>
                          {isMin || isMax ? item.price.toFixed(2) : ''}
                        </span>
                        
                        <div className="chart-bar-fill" style={{ 
                          width: '90%', 
                          maxWidth: '8px', 
                          minWidth: '2px', 
                          height: `${barHeight}px`, 
                          backgroundColor: isMin ? '#10b981' : isMax ? '#ef4444' : '#3b82f6', 
                          borderRadius: '2px 2px 0 0', 
                          opacity: isMin || isMax ? 1 : 0.6,
                          transition: 'opacity 0.2s, filter 0.2s'
                        }}></div>
                        
                        {/* WŁASNY, BŁYSKAWICZNY TOOLTIP (unosi się idealnie nad danym słupkiem) */}
                        <div className="chart-tooltip" style={{ bottom: `calc(${barHeight}px + 26px)` }}>
                          <strong style={{ color: isMin ? '#10b981' : isMax ? '#fca5a5' : '#60a5fa' }}>{item.time}</strong><br/>
                          {item.price.toFixed(2)} PLN
                        </div>

                        <span style={{ 
                          fontSize: '0.6rem', 
                          marginTop: '4px',
                          display: 'block',
                          minHeight: '14px',
                          color: isFullHour && parseInt(item.time.split(':')[0]) % 4 === 0 ? '#888' : 'transparent'
                        }}>
                          {item.time.split(':')[0]}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>

            </div>
          </div>
        ) : (
          <div style={{ padding: '2rem', backgroundColor: '#18181b', borderRadius: '20px', border: '1px solid #333', color: '#eaeaea', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ margin: '0 0 5px 0', fontWeight: 'bold', color: '#ef4444' }}>⚠️ Wystąpił problem z pobraniem danych</p>
              <p style={{ margin: 0, color: '#a1a1aa', fontSize: '0.9rem' }}>{forecastError || "Ładowanie najnowszych cen giełdowych PSE..."}</p>
            </div>
            <a href="/" style={{ padding: '10px 20px', backgroundColor: '#333', color: '#fff', textDecoration: 'none', borderRadius: '8px', fontWeight: 'bold', border: '1px solid #444' }}>
              Wymuś pobranie 🔄
            </a>
          </div>
        )}
      </div>

      <hr style={{ borderColor: '#222', borderBottom: 'none', marginBottom: '3rem' }} />

      {/* SEKCJA 2: LUSTERKO WSTECZNE (DANE Z PLIKU) */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem', flexWrap: 'wrap', gap: '1.5rem' }}>
        <div>
          <h2 style={{ fontSize: '2rem', marginBottom: '0.2rem', margin: 0, color: '#fff' }}>
            Twój Profil Historyczny
          </h2>
          <p style={{ color: '#888', margin: '0.5rem 0 0' }}>Analiza Twoich poprzednich rachunków</p>
        </div>
        
        <div style={{ display: 'flex', gap: '0.2rem', backgroundColor: '#1a1a1a', padding: '0.4rem', borderRadius: '30px', border: '1px solid #333' }}>
          <Link href="/?days=3" style={getBtnStyle(3)}>3 Dni</Link>
          <Link href="/?days=7" style={getBtnStyle(7)}>7 Dni</Link>
          <Link href="/?days=30" style={getBtnStyle(30)}>30 Dni</Link>
        </div>
      </div>

      <UploadSection />

      {chartData.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem', backgroundColor: '#141414', borderRadius: '20px', border: '1px dashed #333' }}>
          <h2 style={{ color: '#fff' }}>Brak danych w bazie</h2>
          <p style={{ color: '#888' }}>Użyj przycisku wyżej, aby wgrać swój plik CSV z Taurona i wygenerować wykresy.</p>
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
            <div style={{ padding: '2rem', backgroundColor: '#141414', borderRadius: '20px', border: '1px solid #222', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
              <h3 style={{ margin: 0, color: '#888', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Koszt ({days} dni)</h3>
              <p style={{ margin: '15px 0 0', fontSize: '2.8rem', fontWeight: '800', color: '#fff' }}>{stats.cost.toFixed(2)} <span style={{fontSize: '1.2rem', color: '#666', fontWeight: 'normal'}}>PLN</span></p>
            </div>
            <div style={{ padding: '2rem', backgroundColor: '#141414', borderRadius: '20px', border: '1px solid #222', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
              <h3 style={{ margin: 0, color: '#888', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Zużycie</h3>
              <p style={{ margin: '15px 0 0', fontSize: '2.8rem', fontWeight: '800', color: '#fff' }}>{stats.kwh.toFixed(2)} <span style={{fontSize: '1.2rem', color: '#666', fontWeight: 'normal'}}>kWh</span></p>
            </div>
            <div style={{ padding: '2rem', backgroundImage: 'linear-gradient(135deg, #064e3b 0%, #022c22 100%)', borderRadius: '20px', border: '1px solid #065f46', boxShadow: '0 10px 30px rgba(6, 78, 59, 0.2)' }}>
              <h3 style={{ margin: 0, color: '#34d399', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Potencjał Optymalizacji</h3>
              <p style={{ margin: '15px 0 0', fontSize: '2.8rem', fontWeight: '800', color: '#10b981' }}>~ {stats.savings.toFixed(2)} <span style={{fontSize: '1.2rem', color: '#059669', fontWeight: 'normal'}}>PLN</span></p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
            <div style={{ padding: '1.5rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '16px' }}>
              <h4 style={{ color: '#ef4444', margin: '0 0 10px 0', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>⚠️</span> Twój historyczny wampir
              </h4>
              <p style={{ margin: 0, color: '#e5e5e5', lineHeight: '1.5', fontSize: '0.95rem' }}>
                Zazwyczaj przepalałeś najwięcej pieniędzy w okolicach godziny <strong>{insights.worstHour}:00</strong>. Pilnuj tego czasu, jeśli widzisz na naszym radarze wysoką cenę prądu!
              </p>
            </div>
          </div>

          <div style={{ backgroundColor: '#141414', padding: '2rem', borderRadius: '24px', border: '1px solid #222', boxShadow: '0 10px 40px rgba(0,0,0,0.3)' }}>
            <h2 style={{ fontSize: '1.2rem', marginBottom: '2rem', color: '#ddd', fontWeight: '500' }}>Szczegółowy profil zużycia</h2>
            <Chart data={chartData} />
          </div>
        </>
      )}
    </main>
  );
}
