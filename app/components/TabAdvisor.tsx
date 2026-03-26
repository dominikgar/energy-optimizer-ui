import React from 'react';
import Link from 'next/link';

const IconTrendingDown = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-500"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>;
const IconClock = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-500"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;

interface TabAdvisorProps {
  days: number;
  selectedProvider: string;
  displayProviders: any[];
  chartData: any[];
  stats: {
    costG11: number;
    costRCE: number;
    worstHour: number;
    worstHourCost: number;
    bestHour: number;
    bestHourPrice: number;
  };
}

export default function TabAdvisor({ days, selectedProvider, displayProviders, chartData, stats }: TabAdvisorProps) {
  return (
    <div className="space-y-6 animate-fade-in-up">
      <h2 className="text-3xl font-black mb-8">Porównanie Taryf (G11 vs RCE)</h2>
      
      <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-xl shadow-slate-200/40 mb-8">
        <div className="mb-6">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-3">Zmień operatora odniesienia:</span>
          <div className="flex flex-wrap gap-2">
            {displayProviders.map(t => (
              <Link 
                key={t.tariff_name} 
                href={`/?tab=advisor&days=${days}&provider=${t.tariff_name}`}
                scroll={false}
                className={`px-4 py-2 rounded-full text-sm font-bold border transition-all ${
                  selectedProvider === t.tariff_name 
                    ? 'bg-amber-500 text-white border-amber-600 shadow-md' 
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {t.tariff_name.replace('G11_', '')}
              </Link>
            ))}
          </div>
        </div>

        {chartData.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
            <div className="p-8 rounded-3xl border-2 border-slate-100 bg-slate-50">
              <div className="text-slate-400 font-bold uppercase text-sm mb-2">Opłata w stałej G11</div>
              <div className="text-4xl font-black text-slate-800">{stats.costG11.toFixed(2)} PLN</div>
            </div>
            <div className="p-8 rounded-3xl border-2 border-emerald-100 bg-emerald-50">
              <div className="text-emerald-600 font-bold uppercase text-sm mb-2">Opłata na Rynku RCE</div>
              <div className="text-4xl font-black text-emerald-600">{stats.costRCE.toFixed(2)} PLN</div>
            </div>
          </div>
        ) : (
          <p className="text-slate-500 p-8 text-center bg-slate-50 rounded-2xl">Wgraj dane w zakładce Historia, aby wykonać obliczenia.</p>
        )}
      </div>

      {chartData.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm flex items-start gap-4">
            <div className="p-3 bg-red-100 rounded-xl text-red-500"><IconTrendingDown /></div>
            <div>
              <h4 className="text-lg font-bold text-slate-800">Wampir Energetyczny</h4>
              <p className="text-slate-500 text-sm mt-1">Najwięcej kosztuje Cię godzina <strong>{String(stats.worstHour).padStart(2, '0')}:00</strong>. Średni rachunek nabity tylko w tej godzinie to <strong className="text-red-500">{stats.worstHourCost.toFixed(2)} PLN</strong>.</p>
            </div>
          </div>
          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm flex items-start gap-4">
            <div className="p-3 bg-emerald-100 rounded-xl text-emerald-500"><IconClock /></div>
            <div>
              <h4 className="text-lg font-bold text-slate-800">Twoja Złota Godzina</h4>
              <p className="text-slate-500 text-sm mt-1">Gdybyś przeniósł zmywarkę na <strong>{String(stats.bestHour).padStart(2, '0')}:00</strong>, płaciłbyś średnio zaledwie <strong className="text-emerald-500">{stats.bestHourPrice.toFixed(2)} PLN/kWh</strong>.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
