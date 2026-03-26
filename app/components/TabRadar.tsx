import React from 'react';

// Definiujemy strukturę danych, jakich wymaga ten komponent
interface TabRadarProps {
  isPremiumUser: boolean;
  todayForecast: {
    date: string;
    bestWindowStart: string;
    bestWindowEnd: string;
    bestWindowAvgPrice: number;
    worstWindowStart: string;
    worstWindowEnd: string;
    worstWindowAvgPrice: number;
    absoluteMinPrice: number;
    absoluteMaxPrice: number;
    prices: { time: string, price: number }[];
  } | null;
  forecastError: string | null;
}

export default function TabRadar({ isPremiumUser, todayForecast, forecastError }: TabRadarProps) {
  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
         <h2 style={{ fontSize: '2rem', fontWeight: 'bold' }}>Plan oszczędności na dziś</h2>
         {todayForecast && <span style={{ color: '#64748b' }}>Dane PSE: <strong>{todayForecast.date}</strong></span>}
      </div>
      
      {todayForecast ? (
        <div style={{ position: 'relative', backgroundColor: '#fff', padding: '2.5rem', borderRadius: '32px', border: '1px solid #e2e8f0', boxShadow: '0 10px 25px rgba(0,0,0,0.05)' }}>
          
          {/* Nakładka blokująca dostęp dla darmowych kont */}
          {!isPremiumUser && (
            <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(255, 255, 255, 0.8)', backdropFilter: 'blur(4px)', zIndex: 10, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', borderRadius: '32px', padding: '2rem' }}>
              <h3 style={{ fontSize: '1.8rem', fontWeight: 'bold', marginBottom: '1rem' }}>Odblokuj pełny radar</h3>
              <p style={{ color: '#475569', marginBottom: '2rem', textAlign: 'center', maxWidth: '400px' }}>
                Analizuj na żywo wszystkie godziny i sprawdzaj szczegółowe prognozy.
              </p>
              <form action="/api/checkout_sessions" method="POST">
                <button type="submit" style={{ padding: '16px 40px', backgroundColor: '#10b981', color: '#fff', border: 'none', borderRadius: '30px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 10px 25px rgba(16, 185, 129, 0.4)' }}>
                  Kup dostęp PRO
                </button>
              </form>
            </div>
          )}
          
          <div className="mobile-col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '3rem' }}>
            <div style={{ padding: '1.5rem', backgroundColor: '#ecfdf5', borderRadius: '24px', border: '1px solid #a7f3d0' }}>
              <p style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#047857', marginBottom: '10px' }}>🟢 NAJTAŃSZE OKNO (3H)</p>
              <p style={{ fontSize: '2.5rem', fontWeight: '900', color: '#065f46', margin: 0 }}>
                {todayForecast.bestWindowStart} - {todayForecast.bestWindowEnd}
              </p>
              <p style={{ margin: '5px 0 0 0', color: '#059669', fontSize: '0.95rem', fontWeight: '500' }}>
                Średnia cena: {todayForecast.bestWindowAvgPrice.toFixed(2)} PLN/kWh
              </p>
            </div>
            <div style={{ padding: '1.5rem', backgroundColor: '#fef2f2', borderRadius: '24px', border: '1px solid #fecaca' }}>
              <p style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#991b1b', marginBottom: '10px' }}>🔴 UNIKAJ ZUŻYCIA</p>
              <p style={{ fontSize: '2.5rem', fontWeight: '900', color: '#7f1d1d', margin: 0 }}>
                {todayForecast.worstWindowStart} - {todayForecast.worstWindowEnd}
              </p>
              <p style={{ margin: '5px 0 0 0', color: '#b91c1c', fontSize: '0.95rem', fontWeight: '500' }}>
                Średnia cena: {todayForecast.worstWindowAvgPrice.toFixed(2)} PLN/kWh
              </p>
            </div>
          </div>

          <div style={{ paddingTop: '2rem', borderTop: '1px solid #e2e8f0' }}>
            <p style={{ margin: '0 0 1rem 0', color: '#64748b', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '600' }}>
              Wizualizacja cen w ciągu doby (PLN/kWh)
            </p>
            <div className="chart-scroll-box" style={{ overflowX: 'auto', width: '100%' }}>
              <div className="chart-flex-box" style={{ display: 'flex', flexDirection: 'column', minWidth: '600px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: '180px', paddingBottom: '10px' }}>
                  {todayForecast.prices.map((item, i) => {
                    const range = (todayForecast.absoluteMaxPrice - todayForecast.absoluteMinPrice) || 1;
                    const barHeight = Math.max(10, ((item.price - todayForecast.absoluteMinPrice) / range) * 120);
                    const isMin = item.price === todayForecast.absoluteMinPrice;
                    const isMax = item.price === todayForecast.absoluteMaxPrice;
                    const isFullHour = item.time.endsWith('00');
                    
                    return (
                      <div key={i} className="chart-col" style={{ flex: '1', display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end', position: 'relative', cursor: 'crosshair' }}>
                        <span style={{ fontSize: '0.65rem', fontWeight: 'bold', color: isMin ? '#10b981' : isMax ? '#ef4444' : 'transparent', marginBottom: '4px', display: 'block', minHeight: '15px' }}>
                          {isMin || isMax ? item.price.toFixed(2) : ''}
                        </span>
                        <div className="chart-bar-fill" style={{ width: '90%', maxWidth: '8px', minWidth: '2px', height: `${barHeight}px`, backgroundColor: isMin ? '#10b981' : isMax ? '#ef4444' : '#cbd5e1', borderRadius: '2px 2px 0 0', opacity: isMin || isMax ? 1 : 0.7, transition: 'opacity 0.2s, filter 0.2s' }}></div>
                        <span style={{ fontSize: '0.6rem', marginTop: '4px', display: 'block', minHeight: '14px', color: isFullHour && parseInt(item.time.split(':')[0]) % 4 === 0 ? '#94a3b8' : 'transparent' }}>
                          {item.time.split(':')[0]}
                        </span>
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
      ) : (
        <p style={{ color: '#ef4444', fontWeight: 'bold' }}>{forecastError || "Ładowanie danych..."}</p>
      )}
    </div>
  );
}
