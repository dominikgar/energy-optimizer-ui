'use client';

import React, { useState } from 'react';

// Definiujemy strukturę danych
interface ForecastData {
  date: string;
  dateLabel?: string;
  bestWindowStart: string;
  bestWindowEnd: string;
  bestWindowAvgPrice: number;
  worstWindowStart: string;
  worstWindowEnd: string;
  worstWindowAvgPrice: number;
  absoluteMinPrice: number;
  absoluteMaxPrice: number;
  prices: { time: string, price: number }[];
}

interface TabRadarProps {
  isPremiumUser: boolean;
  todayForecast: ForecastData | null;
  tomorrowForecast: ForecastData | null;
  forecastError: string | null;
}

const IconZap = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500 fill-emerald-500"><path d="M4 14.71 13.5 3l-1.33 8.29H20l-9.5 11.71 1.33-8.29H4z"/></svg>;

export default function TabRadar({ isPremiumUser, todayForecast, tomorrowForecast, forecastError }: TabRadarProps) {
  // Stan domyślnie pokazuje dzisiaj. Jeśli dzisiaj jest null (bardzo rzadkie), próbuje pokazać jutro.
  const [view, setView] = useState<'today' | 'tomorrow'>(todayForecast ? 'today' : (tomorrowForecast ? 'tomorrow' : 'today'));
  
  const activeForecast = view === 'today' ? todayForecast : tomorrowForecast;

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
         <h2 className="text-3xl font-black">
           Plan oszczędności {activeForecast ? `na ${activeForecast.dateLabel?.toLowerCase()}` : ''}
         </h2>
         
         {/* Przełącznik Dzisiaj / Jutro */}
         <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
           {activeForecast && (
             <span className="text-slate-500 text-sm">
               Dane PSE: <strong>{activeForecast.date}</strong>
             </span>
           )}
           <div className="flex bg-slate-200/50 p-1 rounded-xl">
             <button 
               onClick={() => setView('today')}
               disabled={!todayForecast}
               className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${!todayForecast ? 'opacity-50 cursor-not-allowed' : ''} ${view === 'today' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
             >
               Dzisiaj
             </button>
             <button 
               onClick={() => setView('tomorrow')}
               disabled={!tomorrowForecast}
               className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${!tomorrowForecast ? 'opacity-50 cursor-not-allowed' : ''} ${view === 'tomorrow' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
             >
               Jutro
             </button>
           </div>
         </div>
      </div>
      
      {activeForecast ? (
        <div className="relative bg-white p-8 md:p-12 rounded-[32px] border border-slate-200 shadow-xl shadow-slate-200/40">
          
          {/* Nakładka blokująca dostęp dla darmowych kont */}
          {!isPremiumUser && (
            <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex flex-col justify-center items-center rounded-[32px] p-6 text-center border border-white">
              <div className="bg-emerald-100 p-4 rounded-full mb-4"><IconZap /></div>
              <h3 className="text-2xl font-black mb-2">Odblokuj pełny radar</h3>
              <p className="text-slate-500 mb-8 max-w-md">
                Analizuj na żywo wszystkie godziny i sprawdzaj szczegółowe prognozy.
              </p>
              <form action="/api/checkout_sessions" method="POST">
                <button type="submit" className="px-8 py-4 bg-emerald-500 text-white font-bold rounded-full shadow-lg shadow-emerald-500/30 hover:bg-emerald-600 hover:scale-105 transition-all">
                  Kup dostęp PRO
                </button>
              </form>
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
            <div className="bg-emerald-50 border border-emerald-100 p-8 rounded-3xl">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse"></div>
                <span className="text-emerald-700 font-bold uppercase text-sm tracking-wider">Najtańsze okno (3H)</span>
              </div>
              <p className="text-4xl font-black text-emerald-600 mb-2">
                {activeForecast.bestWindowStart} - {activeForecast.bestWindowEnd}
              </p>
              <p className="text-emerald-500 font-semibold">
                Średnio: {activeForecast.bestWindowAvgPrice.toFixed(2)} PLN/kWh
              </p>
            </div>

            <div className="bg-red-50 border border-red-100 p-8 rounded-3xl">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <span className="text-red-700 font-bold uppercase text-sm tracking-wider">Unikaj zużycia</span>
              </div>
              <p className="text-4xl font-black text-red-600 mb-2">
                {activeForecast.worstWindowStart} - {activeForecast.worstWindowEnd}
              </p>
              <p className="text-red-500 font-semibold">
                Średnio: {activeForecast.worstWindowAvgPrice.toFixed(2)} PLN/kWh
              </p>
            </div>
          </div>

          <div className="pt-8 border-t border-slate-100">
            <p className="text-slate-400 font-bold uppercase text-sm tracking-widest mb-8">
              Wizualizacja cen w ciągu doby (PLN/kWh)
            </p>
            <div className="w-full pb-6">
              <div className="flex flex-col w-full">
                <div className="flex items-end justify-between h-[200px] border-b border-slate-200 pb-2 relative mt-4">
                  
                  {activeForecast.prices.map((item, i) => {
                    const range = (activeForecast.absoluteMaxPrice - activeForecast.absoluteMinPrice) || 1;
                    const barHeight = Math.max(12, ((item.price - activeForecast.absoluteMinPrice) / range) * 140);
                    
                    const timeToMins = (t: string) => {
                        const [h, m] = t.split(':').map(Number);
                        return h * 60 + (m || 0);
                    };
                    const itemMins = timeToMins(item.time);
                    
                    let bestStart = timeToMins(activeForecast.bestWindowStart);
                    let bestEnd = timeToMins(activeForecast.bestWindowEnd);
                    if (bestEnd === 0) bestEnd = 1440; 
                    
                    let worstStart = timeToMins(activeForecast.worstWindowStart);
                    let worstEnd = timeToMins(activeForecast.worstWindowEnd);
                    if (worstEnd === 0) worstEnd = 1440;

                    const isMinWindow = bestStart < bestEnd 
                      ? (itemMins >= bestStart && itemMins < bestEnd)
                      : (itemMins >= bestStart || itemMins < bestEnd);
                      
                    const isMaxWindow = worstStart < worstEnd 
                      ? (itemMins >= worstStart && itemMins < worstEnd)
                      : (itemMins >= worstStart || itemMins < worstEnd);
                    
                    const isAbsoluteMin = item.price === activeForecast.absoluteMinPrice;
                    const isAbsoluteMax = item.price === activeForecast.absoluteMaxPrice;
                    
                    const isFirst = i === 0;
                    const isLast = i === activeForecast.prices.length - 1;
                    const isFullHour = item.time.endsWith('00');
                    
                    return (
                      <div 
                        key={i} 
                        className="flex-1 flex flex-col items-center h-full justify-end relative cursor-crosshair group"
                      >
                        {/* Właściwy Tooltip z Tailwind (Hover) powraca do żywych! */}
                        <div className={`absolute bottom-full mb-3 px-3 py-2 bg-slate-800 text-white text-xs font-bold rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible group-hover:-translate-y-2 transition-all z-50 whitespace-nowrap pointer-events-none flex flex-col items-center ${isFirst ? 'left-0' : isLast ? 'right-0' : 'left-1/2 -translate-x-1/2'}`}>
                          <span className="text-slate-400 font-medium mb-1">{item.time}</span>
                          <span className={item.price < 0 ? 'text-emerald-400' : 'text-white'}>
                            {item.price.toFixed(3)} PLN
                          </span>
                          <div className={`absolute top-full border-4 border-transparent border-t-slate-800 ${isFirst ? 'left-3' : isLast ? 'right-3' : 'left-1/2 -translate-x-1/2'}`}></div>
                        </div>

                        {/* Etykieta Min/Max zawsze widoczna nad ekstremami */}
                        {(isAbsoluteMin || isAbsoluteMax) && (
                          <span className={`absolute bottom-[calc(100%+5px)] text-[9px] sm:text-[10px] font-bold ${isAbsoluteMin ? 'text-emerald-500' : 'text-red-500'}`}>
                            {item.price.toFixed(2)}
                          </span>
                        )}

                        {/* Główny Słupek - Okna (czerwone/zielone) + Hover (niebieski) */}
                        <div 
                          className={`w-[85%] max-w-[16px] min-w-[2px] rounded-t-sm transition-all duration-300 ${
                            isMinWindow ? 'bg-emerald-500 shadow-[0_0_15px_-3px_rgba(16,185,129,0.5)]' : 
                            isMaxWindow ? 'bg-red-500' : 
                            'bg-slate-200 group-hover:bg-blue-400 group-hover:h-[calc(100%+4px)]'
                          }`}
                          style={{ height: `${barHeight}px`, opacity: isMinWindow || isMaxWindow ? 1 : 0.7 }}
                        ></div>

                        {/* Oś godzinowa (pokazujemy rzadziej, by nie zachodziły na siebie) */}
                        {isFullHour && parseInt(item.time.split(':')[0]) % 6 === 0 && (
                          <span className="absolute top-[calc(100%+8px)] text-[10px] text-slate-400 font-bold">
                            {item.time.split(':')[0]}:00
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-8 bg-amber-50 text-amber-700 rounded-2xl border border-amber-200 font-bold">
          {forecastError || "Brak danych z PSE..."}
        </div>
      )}
    </div>
  );
}