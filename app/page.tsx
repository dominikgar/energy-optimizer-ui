// @ts-nocheck
import { Pool } from 'pg';
import Chart from './Chart';

// Łączenie z Twoją bazą Neon
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Ta funkcja wykonuje się na serwerze (bezpiecznie pobiera dane)
export default async function Home() {
  let chartData = [];
  let stats = { cost: 0, kwh: 0, savings: 0 };

  try {
    // Pobieramy ostatnie 3 dni z Twojej bazy
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
      LIMIT 72
    `);

    // Przetwarzanie danych dla wykresu
    chartData = rows.reverse().map(row => ({
      time: new Date(row.timestamp).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' }),
      date: new Date(row.timestamp).toLocaleDateString('pl-PL'),
      kwh: parseFloat(row.value_kwh),
      price: parseFloat(row.price_mwh) / 1000
    }));

    // Obliczanie podsumowania (łączny koszt i zużycie)
    stats.cost = chartData.reduce((sum, curr) => sum + (curr.kwh * curr.price), 0);
    stats.kwh = chartData.reduce((sum, curr) => sum + curr.kwh, 0);
    
    // Potencjalna oszczędność z optymalizacji (15% przesunięcia na tańsze godziny)
    stats.savings = stats.cost * 0.115; // Szacunkowe 11.5% z naszej poprzedniej analizy
    
  } catch (error) {
    console.error("Błąd bazy danych:", error);
  }

  return (
    <main style={{ padding: '3rem', fontFamily: 'system-ui, sans-serif', maxWidth: '1200px', margin: '0 auto', color: '#eaeaea', backgroundColor: '#111', minHeight: '100vh' }}>
      <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>⚡ Energy Optimizer AI</h1>
      <p style={{ color: '#888', marginBottom: '3rem' }}>Inteligentna analityka Twojego profilu zużycia na taryfach dynamicznych.</p>

      {/* Panele z wynikami */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
        
        <div style={{ padding: '1.5rem', backgroundColor: '#222', borderRadius: '12px', border: '1px solid #333' }}>
          <h3 style={{ margin: 0, color: '#aaa', fontSize: '1rem' }}>Koszt (Ostatnie 3 dni)</h3>
          <p style={{ margin: '10px 0 0', fontSize: '2.5rem', fontWeight: 'bold', color: '#fff' }}>{stats.cost.toFixed(2)} PLN</p>
        </div>

        <div style={{ padding: '1.5rem', backgroundColor: '#222', borderRadius: '12px', border: '1px solid #333' }}>
          <h3 style={{ margin: 0, color: '#aaa', fontSize: '1rem' }}>Zużycie energii</h3>
          <p style={{ margin: '10px 0 0', fontSize: '2.5rem', fontWeight: 'bold', color: '#fff' }}>{stats.kwh.toFixed(2)} kWh</p>
        </div>

        <div style={{ padding: '1.5rem', backgroundColor: '#1a2e1a', borderRadius: '12px', border: '1px solid #2d5a2d' }}>
          <h3 style={{ margin: 0, color: '#90ee90', fontSize: '1rem' }}>Możliwe do zaoszczędzenia</h3>
          <p style={{ margin: '10px 0 0', fontSize: '2.5rem', fontWeight: 'bold', color: '#90ee90' }}>~ {stats.savings.toFixed(2)} PLN</p>
          <p style={{ margin: '5px 0 0', fontSize: '0.8rem', color: '#66aa66' }}>Przez przesunięcie 15% zużycia</p>
        </div>

      </div>

      {/* Wykres */}
      <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>Profil Zużycia vs. Ceny (Ostatnie 72h)</h2>
      <Chart data={chartData} />
    </main>
  );
}
