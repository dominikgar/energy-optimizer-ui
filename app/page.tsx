// @ts-nocheck
export const dynamic = "force-dynamic"; // Wycłącza agresywny cache Next.js

import { Pool } from 'pg';
import Chart from './Chart';
import UploadSection from './UploadSection';
import Link from 'next/link';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Zauważ dodany parametr searchParams - to on łapie kliknięcia w nasze filtry czasowe!
export default async function Home({ searchParams }) {
  // Domyślnie ładujemy 3 dni. Jeśli użytkownik kliknie np. ?days=30, załaduje 30.
  const days = parseInt(searchParams.days) || 3;
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
      WHERE c.type ILIKE '%pobór%' OR c.type ILIKE '%pobor%'
      ORDER BY c.timestamp DESC
      LIMIT $1
    `, [hoursLimit]); // Dynamiczny limit SQL!

    chartData = rows.reverse().map(row => ({
      time: new Date(row.timestamp).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' }),
      date: new Date(row.timestamp).toLocaleDateString('pl-PL', { month: 'short', day: 'numeric' }),
      label: new Date(row.timestamp).toLocaleString('pl-PL', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }), // Format dla dłuższego wykresu
      kwh: parseFloat(row.value_kwh),
      price: parseFloat(row.price_mwh) / 1000
    }));

    stats.cost = chartData.reduce((sum, curr) => sum + (curr.kwh * curr.price), 0);
    stats.kwh = chartData.reduce((sum, curr) => sum + curr.kwh, 0);
    stats.savings = stats.cost * 0.115;
    
  } catch (error) {
    console.error("Błąd bazy danych:", error);
  }

  // Funkcja pomocnicza, żeby ładnie kolorować wciśnięty guzik
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
      
      {/* Header i Panel Sterowania */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem', flexWrap: 'wrap', gap: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '2.5rem', marginBottom: '0.2rem', margin: 0, background: 'linear-gradient(to right, #10b981, #3b82f6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            ⚡ Energy Optimizer AI
          </h1>
          <p style={{ color: '#888', margin: '0.5rem 0 0' }}>Analityka Twojego profilu zużycia</p>
        </div>
        
        {/* Przełączniki Czasu */}
        <div style={{ display: 'flex', gap: '0.2rem', backgroundColor: '#1a1a1a', padding: '0.4rem', borderRadius: '30px', border: '1px solid #333' }}>
          <Link href="/?days=3" style={getBtnStyle(3)}>3 Dni</Link>
          <Link href="/?days=7" style={getBtnStyle(7)}>7 Dni</Link>
          <Link href="/?days=30" style={getBtnStyle(30)}>30 Dni</Link>
        </div>
      </div>

      {/* NOWY PANEL WGRYWANIA */}
      <UploadSection />

      {/* Kafelki ze Statystykami */}
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

      {/* Kontener Wykresu */}
      <div style={{ backgroundColor: '#141414', padding: '2rem', borderRadius: '24px', border: '1px solid #222', boxShadow: '0 10px 40px rgba(0,0,0,0.3)' }}>
        <h2 style={{ fontSize: '1.2rem', marginBottom: '2rem', color: '#ddd', fontWeight: '500' }}>Szczegółowy profil (Ostatnie {days} dni)</h2>
        <Chart data={chartData} />
      </div>
    </main>
  );
}
