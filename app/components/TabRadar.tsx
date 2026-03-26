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

const IconZap = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500 fill-emerald-500"><path d="M4 14.71 13.5 3l-1.33 8.29H20l-9.5 11.71 1.33-8.29H4z"/></svg>;

export default function TabRadar({ isPremiumUser, todayForecast, forecastError }: TabRadarProps) {
  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex justify-between items-end">
         <h2 className="text-3xl font-black">Plan na dziś</h2>
         {todayForecast && <span className="text-slate-500 font-medium bg-slate-200/50 px-4 py-2 rounded-full text-sm">Ceny PSE: <strong>{todayForecast.date}</strong></span>}
      </div>
      
      {todayForecast ? (
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
                {todayForecast.bestWindowStart} - {todayForecast.bestWindowEnd}
              </p>
              <p className="text-emerald-500 font-semibold">
                Średnio: {todayForecast.bestWindowAvgPrice.toFixed(2)} PLN/kWh
              </p>
            </div>

            <div className="bg-red-50 border border-red-100 p-8 rounded-3xl">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <span className="text-red-700 font-bold uppercase text-sm tracking-wider">Unikaj zużycia</span>
              </div>
              <p className="text-4xl font-black text-red-600 mb-2">
                {todayForecast.worstWindowStart} - {todayForecast.worstWindowEnd}
              </p>
              <p className="text-red-500 font-semibold">
                Średnio: {todayForecast.worstWindowAvgPrice.toFixed(2)} PLN/kWh
              </p>
            </div>
          </div>

          <div className="pt-8 border-t border-slate-100">
            <p className="text-slate-400 font-bold uppercase text-sm tracking-widest mb-8">
              Wizualizacja cen w ciągu doby (PLN/kWh)
            </p>
            {/* ZMIANA: Usunięto overflow-x-auto, wykres idealnie wypełni dostępną szerokość */}
            <div className="w-full pb-6">
              <div className="flex flex-col w-full">
                <div className="flex items-end justify-between h-[200px] border-b border-slate-200 pb-2 relative mt-4">
                  
                  {todayForecast.prices.map((item, i) => {
                    const range = (todayForecast.absoluteMaxPrice - todayForecast.absoluteMinPrice) || 1;
                    const barHeight = Math.max(12, ((item.price - todayForecast.absoluteMinPrice) / range) * 140);
                    const isMin = item.price === todayForecast.absoluteMinPrice;
                    const isMax = item.price === todayForecast.absoluteMaxPrice;
                    
                    // Określamy skrajne pozycje dla bezpiecznego renderowania dymków
                    const isFirst = i === 0;
                    const isLast = i === todayForecast.prices.length - 1;
                    
                    return (
                      <div 
                        key={i} 
                        className="flex-1 flex flex-col items-center h-full justify-end relative cursor-crosshair group"
                      >
                        {/* Tooltip (Hover) - inteligentne pozycjonowanie na krawędziach */}
                        <div className={`absolute bottom-full mb-3 px-3 py-2 bg-slate-800 text-white text-xs font-bold rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible group-hover:-translate-y-2 transition-all z-50 whitespace-nowrap pointer-events-none flex flex-col items-center ${isFirst ? 'left-0' : isLast ? 'right-0' : 'left-1/2 -translate-x-1/2'}`}>
                          <span className="text-slate-400 font-medium mb-1">{item.time}</span>
                          <span className={item.price < 0 ? 'text-emerald-400' : 'text-white'}>
                            {item.price.toFixed(3)} PLN
                          </span>
                          {/* Trójkącik u dołu tooltipa */}
                          <div className={`absolute top-full border-4 border-transparent border-t-slate-800 ${isFirst ? 'left-3' : isLast ? 'right-3' : 'left-1/2 -translate-x-1/2'}`}></div>
                        </div>

                        {/* Etykieta Min/Max - ABSOLUTE (nie zajmuje fizycznie szerokości kolumny!) */}
                        {(isMin || isMax) && (
                          <span className={`absolute bottom-[calc(100%+5px)] text-[9px] sm:text-[10px] font-bold ${isMin ? 'text-emerald-500' : 'text-red-500'}`}>
                            {item.price.toFixed(2)}
                          </span>
                        )}

                        {/* Słupek z wykresem */}
                        <div 
                          className={`w-[85%] max-w-[16px] min-w-[2px] rounded-t-sm transition-all duration-300 ${
                            isMin ? 'bg-emerald-500 shadow-[0_0_15px_-3px_rgba(16,185,129,0.5)]' : 
                            isMax ? 'bg-red-500' : 
                            'bg-slate-200 group-hover:bg-blue-400 group-hover:h-[calc(100%+4px)]'
                          }`}
                          style={{ height: `${barHeight}px`, opacity: isMin || isMax ? 1 : 0.8 }}
                        ></div>

                      </div>
                    )
                  })}
                </div>
                
                {/* Oś X (Godziny) */}
                <div className="flex justify-between mt-3 text-slate-400 text-xs font-bold px-1">
                   <span>00:00</span>
                   <span>06:00</span>
                   <span>12:00</span>
                   <span>18:00</span>
                   <span>23:00</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-8 bg-amber-50 text-amber-700 rounded-2xl border border-amber-200 font-bold">
          {forecastError || "Ładowanie danych z PSE..."}
        </div>
      )}
    </div>
  );
}
