// @ts-nocheck
export const dynamic = "force-dynamic";

import { Pool } from 'pg';
import Chart from './Chart';
import Link from 'next/link';
import UploadSection from './UploadSection';
import { auth } from '@clerk/nextjs/server';
import { SignInButton } from '@clerk/nextjs';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

export default async function Home({ searchParams }) {
  const { userId } = auth();

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
                <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>💡</div>
                <h3 style={{ fontSize: '1.4rem', color: '#e4e4e7', marginBottom: '1rem' }}>Konkretne wnioski</h3>
                <p style={{ color: '#a1a1aa', lineHeight: '1.6' }}>Nie tylko pokazujemy dane. Podpowiadamy, z jakich godzin powinieneś zrezygnować, a w jakich włączać zmywarkę.</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

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

    // Grupowanie godzin do analizy nawyków
    const hourlyAggregation = Array(24).fill(null).map(() => ({ cost: 0, priceSum: 0, count: 0 }));

    chartData = rows.reverse().map(row => {
      const kwh = parseFloat(row.value_kwh);
      const price = parseFloat(row.price_mwh) / 1000;
      const timestamp = new Date(row.timestamp);
      const hourOfDay = timestamp.getHours();

      // Zbieramy dane do agregacji
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

    // Szukamy najlepszej i najgorszej godziny
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
    <main style={{ padding: '3rem', fontFamily: 'system-ui, sans-serif', maxWidth: '1200px', margin: '0 auto', color: '#eaeaea', backgroundColor: '#0a0a0a', minHeight: '100vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem', flexWrap: 'wrap', gap: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '2.5rem', marginBottom: '0.2rem', margin: 0, background: 'linear-gradient(to right, #10b981, #3b82f6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            ⚡ Twój Profil Zużycia
          </h1>
          <p style={{ color: '#888', margin: '0.5rem 0 0' }}>Inteligentna analiza nawyków</p>
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

          {/* NOWA SEKCJA WNIOSKÓW (ACTIONABLE INSIGHTS) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
            <div style={{ padding: '1.5rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '16px' }}>
              <h4 style={{ color: '#ef4444', margin: '0 0 10px 0', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>⚠️</span> Twój Wampir Energetyczny
              </h4>
              <p style={{ margin: 0, color: '#e5e5e5', lineHeight: '1.5', fontSize: '0.95rem' }}>
                Twój najdroższy czas to okolice godziny <strong>{insights.worstHour}:00</strong>. Przez wybrane dni zapłaciłeś wtedy najwięcej ({insights.worstCost.toFixed(2)} PLN). Spróbuj unikać energochłonnych zadań w tym czasie!
              </p>
            </div>
            <div style={{ padding: '1.5rem', backgroundColor: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: '16px' }}>
              <h4 style={{ color: '#3b82f6', margin: '0 0 10px 0', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>✅</span> Złote Okno Oszczędności
              </h4>
              <p style={{ margin: 0, color: '#e5e5e5', lineHeight: '1.5', fontSize: '0.95rem' }}>
                W Twoim profilu prąd jest najtańszy w okolicach godziny <strong>{insights.bestHour}:00</strong> (średnio {insights.bestPrice.toFixed(2)} PLN/kWh). To idealny moment na opóźniony start pralki, zmywarki lub grzanie wody!
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
