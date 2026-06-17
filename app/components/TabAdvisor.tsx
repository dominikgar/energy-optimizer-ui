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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-2">
        <div>
          <h2 className="text-3xl font-black">Porównanie orientacyjne</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
            Zestawienie porównuje wybraną stawkę G11 z surową ceną RCE. Nie jest pełnym rachunkiem taryfy dynamicznej i nie obejmuje m.in. marży sprzedawcy, opłaty handlowej, podatków ani dystrybucji.
          </p>
        </div>
        <div className="flex bg-slate-200/50 p-1 rounded-xl">
          {[3, 7, 30].map((value) => (
            <Link
              key={value}
              href={`/?tab=advisor&days=${value}&provider=${selectedProvider}`}
              scroll={false}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${days === value ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
            >
              {value} dni
            </Link>
          ))}
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 p-5 rounded-2xl text-sm leading-6 text-amber-900">
        <strong>Ważne:</strong> surowa cena RCE jest składnikiem kalkulacji, a nie ceną końcową z faktury. Przed zmianą taryfy porównaj wynik z regulaminem i cennikiem konkretnej oferty sprzedawcy.
      </div>

      <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-xl shadow-slate-200/40 mb-8">
        <div className="mb-6">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-3">Stawka G11 użyta jako punkt odniesienia:</span>
          <div className="flex flex-wrap gap-2">
            {displayProviders.map((tariff) => (
              <Link
                key={tariff.tariff_name}
                href={`/?tab=advisor&days=${days}&provider=${tariff.tariff_name}`}
                scroll={false}
                className={`px-4 py-2 rounded-full text-sm font-bold border transition-all ${
                  selectedProvider === tariff.tariff_name
                    ? 'bg-amber-500 text-white border-amber-600 shadow-md'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {tariff.tariff_name.replace('G11_', '')}
              </Link>
            ))}
          </div>
        </div>

        {chartData.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
            <div className="p-8 rounded-3xl border-2 border-slate-100 bg-slate-50">
              <div className="text-slate-400 font-bold uppercase text-sm mb-2">Koszt według wybranej stawki G11</div>
              <div className="text-4xl font-black text-slate-800">{stats.costG11.toFixed(2)} PLN</div>
            </div>
            <div className="p-8 rounded-3xl border-2 border-emerald-100 bg-emerald-50">
              <div className="text-emerald-600 font-bold uppercase text-sm mb-2">Koszt energii według surowego RCE</div>
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
              <h4 className="text-lg font-bold text-slate-800">Najwyższy koszt godzinowy</h4>
              <p className="text-slate-500 text-sm mt-1">W analizowanym zakresie najwięcej kosztowała łącznie godzina <strong>{String(stats.worstHour).padStart(2, '0')}:00</strong>: <strong className="text-red-500">{stats.worstHourCost.toFixed(2)} PLN</strong> według surowego RCE.</p>
            </div>
          </div>
          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm flex items-start gap-4">
            <div className="p-3 bg-emerald-100 rounded-xl text-emerald-500"><IconClock /></div>
            <div>
              <h4 className="text-lg font-bold text-slate-800">Najtańsza średnia godzina</h4>
              <p className="text-slate-500 text-sm mt-1">Najniższa średnia surowa cena RCE występowała około <strong>{String(stats.bestHour).padStart(2, '0')}:00</strong> i wynosiła <strong className="text-emerald-500">{stats.bestHourPrice.toFixed(3)} PLN/kWh</strong>.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
