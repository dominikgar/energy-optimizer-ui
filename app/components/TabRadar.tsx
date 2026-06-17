'use client';

import React, { useEffect, useState } from 'react';

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
  prices: { time: string; price: number }[];
}

interface TabRadarProps {
  isPremiumUser: boolean;
  todayForecast: ForecastData | null;
  tomorrowForecast: ForecastData | null;
  forecastError: string | null;
}

const IconZap = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500 fill-emerald-500">
    <path d="M4 14.71 13.5 3l-1.33 8.29H20l-9.5 11.71 1.33-8.29H4z" />
  </svg>
);

export default function TabRadar({ isPremiumUser, todayForecast, tomorrowForecast, forecastError }: TabRadarProps) {
  const [view, setView] = useState<'today' | 'tomorrow'>('today');

  useEffect(() => {
    if (todayForecast) setView('today');
    else if (tomorrowForecast) setView('tomorrow');
  }, [todayForecast, tomorrowForecast]);

  if (!isPremiumUser) {
    return (
      <div className="bg-white p-8 md:p-12 rounded-[32px] border border-slate-200 shadow-xl shadow-slate-200/40 text-center">
        <div className="mx-auto w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-5">
          <IconZap />
        </div>
        <h2 className="text-3xl font-black mb-3">Radar Cenowy PSE</h2>
        <p className="text-slate-500 max-w-xl mx-auto mb-8 leading-relaxed">
          Pakiet PRO udostępnia ceny na dziś i jutro, najtańsze trzygodzinne okno oraz API dla Home Assistanta. Dane radaru nie są pobierane ani przesyłane do przeglądarki na koncie bez PRO.
        </p>
        <form action="/api/checkout_sessions" method="POST">
          <button type="submit" className="px-8 py-4 bg-emerald-500 text-white font-bold rounded-full shadow-lg shadow-emerald-500/30 hover:bg-emerald-600 transition-colors">
            Kup dostęp PRO
          </button>
        </form>
      </div>
    );
  }

  const activeForecast = view === 'today' ? todayForecast : tomorrowForecast;

  const timeToMinutes = (time: string) => {
    const [hour, minute] = time.split(':').map(Number);
    return hour * 60 + (minute || 0);
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h2 className="text-3xl font-black">Radar Cenowy PSE</h2>
          {activeForecast && (
            <p className="text-slate-500 mt-2 text-sm font-medium">
              Dane giełdowe dla dnia: <strong className="text-blue-600">{activeForecast.dateLabel} ({activeForecast.date})</strong>
            </p>
          )}
        </div>

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

      {activeForecast ? (
        <div className="bg-white p-8 md:p-12 rounded-[32px] border border-slate-200 shadow-xl shadow-slate-200/40">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
            <div className="bg-emerald-50 border border-emerald-100 p-8 rounded-3xl">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse" />
                <span className="text-emerald-700 font-bold uppercase text-sm tracking-wider">Najtańsze okno (3h)</span>
              </div>
              <p className="text-4xl font-black text-emerald-600 mb-2">
                {activeForecast.bestWindowStart} – {activeForecast.bestWindowEnd}
              </p>
              <p className="text-emerald-500 font-semibold">
                Średnia surowa cena RCE: {activeForecast.bestWindowAvgPrice.toFixed(3)} PLN/kWh
              </p>
            </div>

            <div className="bg-red-50 border border-red-100 p-8 rounded-3xl">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-3 h-3 bg-red-500 rounded-full" />
                <span className="text-red-700 font-bold uppercase text-sm tracking-wider">Najdroższe okno</span>
              </div>
              <p className="text-4xl font-black text-red-600 mb-2">
                {activeForecast.worstWindowStart} – {activeForecast.worstWindowEnd}
              </p>
              <p className="text-red-500 font-semibold">
                Średnia surowa cena RCE: {activeForecast.worstWindowAvgPrice.toFixed(3)} PLN/kWh
              </p>
            </div>
          </div>

          <div className="pt-8 border-t border-slate-100">
            <p className="text-slate-400 font-bold uppercase text-sm tracking-widest mb-8">
              Surowe ceny RCE w ciągu doby (PLN/kWh)
            </p>
            <div className="w-full pb-6">
              <div className="flex flex-col w-full">
                <div className="flex items-end justify-between h-[240px] border-b border-slate-200 pb-2 relative mt-4">
                  {activeForecast.prices.map((item, index) => {
                    const range = activeForecast.absoluteMaxPrice - activeForecast.absoluteMinPrice || 1;
                    const barHeight = Math.max(12, ((item.price - activeForecast.absoluteMinPrice) / range) * 140);
                    const itemMinutes = timeToMinutes(item.time);

                    let bestStart = timeToMinutes(activeForecast.bestWindowStart);
                    let bestEnd = timeToMinutes(activeForecast.bestWindowEnd);
                    if (bestEnd === 0) bestEnd = 1440;

                    let worstStart = timeToMinutes(activeForecast.worstWindowStart);
                    let worstEnd = timeToMinutes(activeForecast.worstWindowEnd);
                    if (worstEnd === 0) worstEnd = 1440;

                    const isBestWindow = bestStart < bestEnd
                      ? itemMinutes >= bestStart && itemMinutes < bestEnd
                      : itemMinutes >= bestStart || itemMinutes < bestEnd;
                    const isWorstWindow = worstStart < worstEnd
                      ? itemMinutes >= worstStart && itemMinutes < worstEnd
                      : itemMinutes >= worstStart || itemMinutes < worstEnd;
                    const isAbsoluteMin = item.price === activeForecast.absoluteMinPrice;
                    const isAbsoluteMax = item.price === activeForecast.absoluteMaxPrice;
                    const isFirst = index === 0;
                    const isLast = index === activeForecast.prices.length - 1;

                    return (
                      <div key={`${item.time}-${index}`} className="flex-1 flex flex-col items-center h-full justify-end relative cursor-crosshair group">
                        <div
                          className={`absolute mb-3 px-3 py-2 bg-slate-800 text-white text-xs font-bold rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible group-hover:-translate-y-2 transition-all z-50 whitespace-nowrap pointer-events-none flex flex-col items-center ${isFirst ? 'left-0' : isLast ? 'right-0' : 'left-1/2 -translate-x-1/2'}`}
                          style={{ bottom: `${barHeight}px` }}
                        >
                          <span className="text-slate-400 font-medium mb-1">{item.time}</span>
                          <span className={item.price < 0 ? 'text-emerald-400' : 'text-white'}>{item.price.toFixed(3)} PLN/kWh</span>
                        </div>

                        {(isAbsoluteMin || isAbsoluteMax) && (
                          <span className={`absolute text-[9px] sm:text-[10px] font-bold ${isAbsoluteMin ? 'text-emerald-500' : 'text-red-500'}`} style={{ bottom: `${barHeight + 4}px` }}>
                            {item.price.toFixed(2)}
                          </span>
                        )}

                        <div
                          className={`w-[85%] max-w-[16px] min-w-[2px] rounded-t-sm transition-all duration-300 ${isBestWindow ? 'bg-emerald-500' : isWorstWindow ? 'bg-red-500' : 'bg-slate-200 group-hover:bg-blue-400'}`}
                          style={{ height: `${barHeight}px`, opacity: isBestWindow || isWorstWindow ? 1 : 0.7 }}
                        />
                      </div>
                    );
                  })}
                </div>

                <div className="flex justify-between mt-3 text-slate-400 text-xs font-bold px-1">
                  <span>00:00</span><span>06:00</span><span>12:00</span><span>18:00</span><span>23:00</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-8 bg-amber-50 text-amber-700 rounded-2xl border border-amber-200 font-bold">
          {forecastError || 'Brak danych z PSE.'}
        </div>
      )}
    </div>
  );
}
