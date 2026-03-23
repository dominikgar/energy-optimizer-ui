// @ts-nocheck
export const dynamic = "force-dynamic";

import { Pool } from 'pg';
import Chart from './Chart';
import Link from 'next/link';
import UploadSection from './UploadSection';
import { auth } from '@clerk/nextjs/server';
import { SignInButton } from '@clerk/nextjs'; // Dodany import przycisku logowania!

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

export default async function Home({ searchParams }) {
  const { userId } = auth();

  // --- ZAAWANSOWANY LANDING PAGE DLA GOŚCI ---
  if (!userId) {
    return (
      <main style={{ padding: '0', fontFamily: 'system-ui, sans-serif', color: '#eaeaea', backgroundColor: '#0a0a0a', minHeight: '100vh' }}>
        
        {/* Sekcja Hero (Główna) */}
        <div style={{ padding: '8rem 2rem 6rem', textAlign: 'center', maxWidth: '900px', margin: '0 auto' }}>
          <div style={{ display: 'inline-block', padding: '6px 16px', backgroundColor: '#1a2e1a', color: '#34d399', borderRadius: '20px', fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '2rem', border: '1px solid #2d5a2d' }}>
            Nowość: Gotowe na taryfy dynamiczne 2024/2025
          </div>
          <h1 style={{ fontSize: '4.5rem', marginBottom: '1.5rem', background: 'linear-gradient(to right, #10b981, #3b82f6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontWeight: '900', lineHeight: '1.1', letterSpacing: '-1px' }}>
            Zapanuj nad swoim rachunkiem za prąd
          </h1>
          <p style={{ color: '#a1a1aa', fontSize: '1.3rem', marginBottom: '3rem', lineHeight: '1.6', maxWidth: '700px', margin: '0 auto 3rem' }}>
            Wgraj swój plik z Taurona i natychmiast dowiedz się, ile realnie kosztuje Cię prąd na giełdzie. Odkryj swój potencjał oszczędności dzięki inteligentnej analityce.
          </p>
          
          <SignInButton mode="modal">
            <button style={{ padding: '16px 40px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '30px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1.2rem', boxShadow: '0 10px 25px rgba(16, 185, 129, 0.4)', transition: 'transform 0.2s' }}>
              Zacznij optymalizację za darmo
            </button>
          </SignInButton>
        </div>

        {/* Sekcja Funkcji (Co zyskujesz) */}
        <div style={{ backgroundColor: '#111', padding: '5rem 2rem', borderTop: '1px solid #222', borderBottom: '1px solid #222' }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <h2 style={{ textAlign: 'center', fontSize: '2.5rem', marginBottom: '4rem', color: '#fff', fontWeight: 'bold' }}>Co znajdziesz w środku?</h2>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem' }}>
              
              <div style={{ padding: '2.5rem', backgroundColor: '#18181b', borderRadius: '24px', border: '1px solid #27272a' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>📊</div>
                <h3 style={{ fontSize: '1.4rem', color: '#e4e4e7', marginBottom: '1rem' }}>Analityka 15-minutowa</h3>
                <p style={{ color: '#a1a1aa', lineHeight: '1.6' }}>Łączymy Twoje dane od operatora z oficjalnymi cenami PSE. Zobaczysz dokładny koszt każdego kwadransa swojego zużycia na przepięknym, interaktywnym wykresie.</p>
              </div>

              <div style={{ padding: '2.5rem', backgroundColor: '#18181b', borderRadius: '24px', border: '1px solid #27272a' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>💰</div>
                <h3 style={{ fontSize: '1.4rem', color: '#e4e4e7', marginBottom: '1rem' }}>Kalkulator oszczędności</h3>
                <p style={{ color: '#a1a1aa', lineHeight: '1.6' }}>Nasz algorytm AI oblicza, ile gotówki odzyskasz, jeśli przesuniesz zaledwie 15% swojego najbardziej kosztochłonnego zużycia na najtańsze godziny w ciągu doby.</p>
              </div>

              <div style={{ padding: '2.5rem', backgroundColor: '#18181b', borderRadius: '24px', border: '1px solid #27272a' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🔒</div>
                <h3 style={{ fontSize: '1.4rem', color: '#e4e4e7', marginBottom: '1rem' }}>Prywatność danych</h3>
                <p style={{ color: '#a1a1aa', lineHeight: '1.6' }}>Każdy wgrany plik jest trwale przypisywany do Twojego bezpiecznego konta. Tylko Ty masz dostęp do swojego profilu energetycznego.</p>
              </div>

            </div>
          </div>
        </div>

        {/* Mała stopka */}
        <footer style={{ textAlign: 'center', padding: '3rem', color: '#555', fontSize: '0.9rem' }}>
          © 2025-2026 Energy Optimizer AI. Zbudowane dla optymalizacji na RCE-PLN.
        </footer>

      </main>
    );
  }

  // --- KOD DLA ZALOGOWANYCH UŻYTKOWNIKÓW (BEZ ZMIAN) ---
  const days = parseInt(searchParams?.days) || 3;
  const hoursLimit = days * 24;

  let chartData = [];
  let stats = { cost: 0, kwh: 0, savings: 0 };

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

    chartData = rows.reverse().map(row => ({
      time: new Date(row.timestamp).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' }),
      date: new Date(row.timestamp).toLocaleDateString('pl-PL', { month: 'short', day: 'numeric' }),
      label: new Date(row.timestamp).toLocaleString('pl-PL', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
      kwh: parseFloat(row.value_kwh),
      price: parseFloat(row.price_mwh) / 1000
    }));

    stats.cost = chartData.reduce((sum, curr) => sum + (curr.kwh * curr.price), 0);
    stats.kwh = chartData.reduce((sum, curr) => sum + curr.kwh, 0);
    stats.savings = stats.cost * 0.115;
    
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
          <p style={{ color: '#888', margin: '0.5rem 0 0' }}>Bezpieczne dane powiązane z Twoim kontem</p>
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
            <div style={{ padding: '2rem', backgroundColor: '#141414', borderRadius: '20px', border: '1px solid #222', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
              <h3 style={{ margin: 0, color: '#888', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Koszt energii ({days} dni)</h3>
              <p style={{ margin: '15px 0 0', fontSize: '2.8rem', fontWeight: '800', color: '#fff' }}>{stats.cost.toFixed(2)} <span style={{fontSize: '1.2rem', color: '#666', fontWeight: 'normal'}}>PLN</span></p>
            </div>
            <div style={{ padding: '2rem', backgroundColor: '#141414', borderRadius: '20px', border: '1px solid #222', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
              <h3 style={{ margin: 0, color: '#888', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Całkowite Zużycie</h3>
              <p style={{ margin: '15px 0 0', fontSize: '2.8rem', fontWeight: '800', color: '#fff' }}>{stats.kwh.toFixed(2)} <span style={{fontSize: '1.2rem', color: '#666', fontWeight: 'normal'}}>kWh</span></p>
            </div>
            <div style={{ padding: '2rem', backgroundImage: 'linear-gradient(135deg, #064e3b 0%, #022c22 100%)', borderRadius: '20px', border: '1px solid #065f46', boxShadow: '0 10px 30px rgba(6, 78, 59, 0.2)' }}>
              <h3 style={{ margin: 0, color: '#34d399', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Potencjał Optymalizacji</h3>
              <p style={{ margin: '15px 0 0', fontSize: '2.8rem', fontWeight: '800', color: '#10b981' }}>~ {stats.savings.toFixed(2)} <span style={{fontSize: '1.2rem', color: '#059669', fontWeight: 'normal'}}>PLN</span></p>
              <p style={{ margin: '8px 0 0', fontSize: '0.85rem', color: '#6ee7b7', opacity: 0.8 }}>Przy przesunięciu 15% zużycia na tańsze godziny</p>
            </div>
          </div>

          <div style={{ backgroundColor: '#141414', padding: '2rem', borderRadius: '24px', border: '1px solid #222', boxShadow: '0 10px 40px rgba(0,0,0,0.3)' }}>
            <h2 style={{ fontSize: '1.2rem', marginBottom: '2rem', color: '#ddd', fontWeight: '500' }}>Szczegółowy profil (Ostatnie {days} dni)</h2>
            <Chart data={chartData} />
          </div>
        </>
      )}
    </main>
  );
}
