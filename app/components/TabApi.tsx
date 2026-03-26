import React from 'react';

interface TabApiProps {
  userApiKey: string | null;
  todayForecast: any;
}

export default function TabApi({ userApiKey, todayForecast }: TabApiProps) {
  return (
    <div className="space-y-6 animate-fade-in-up">
      <h2 className="text-3xl font-black mb-8">Automatyzacje API</h2>
      
      <div className="bg-white p-8 md:p-12 rounded-[32px] border border-slate-200 shadow-xl shadow-slate-200/40">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <div>
            <h3 className="text-xl font-bold mb-4">Twój Klucz Autoryzacji</h3>
            <div className="bg-slate-100 p-4 rounded-xl mb-8 flex items-center justify-between">
              <code className="text-blue-600 font-bold break-all">
                {userApiKey || 'Zaloguj się i kup pakiet PRO, by wygenerować klucz.'}
              </code>
            </div>

            <h3 className="text-xl font-bold mb-4">Konfiguracja Home Assistant</h3>
            <p className="text-slate-500 text-sm mb-4">Wklej ten kod do pliku <code>configuration.yaml</code>, aby utworzyć sensory sterujące pompą ciepła.</p>
            <pre className="bg-slate-900 text-emerald-400 p-6 rounded-2xl text-sm font-mono overflow-x-auto shadow-inner">
import React from 'react';
import Link from 'next/link';
// ZMIANA: Poprawione ścieżki wyjścia o jeden folder wyżej
import Chart from '../Chart';
import UploadSection from '../UploadSection';

interface TabHistoryProps {
  days: number;
  chartData: any[];
}

export default function TabHistory({ days, chartData }: TabHistoryProps) {
  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <h2 className="text-3xl font-black">Profil Zużycia</h2>
        <div className="flex bg-slate-200/50 p-1 rounded-xl">
          {[3, 7, 30].map(d => (
            <Link 
              key={d} 
              href={`/?tab=history&days=${d}`} 
              scroll={false}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${days === d ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
            >
              {d} Dni
            </Link>
          ))}
        </div>
      </div>

      {chartData.length > 0 ? (
        <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-xl shadow-slate-200/40">
          <Chart data={chartData} />
          <div className="mt-12 pt-8 border-t border-slate-100">
            <h3 className="text-xl font-bold mb-6">Zaktualizuj dane (Wgraj nowy plik)</h3>
            <UploadSection />
          </div>
        </div>
      ) : (
        <div className="mt-8">
          <UploadSection />
        </div>
      )}
    </div>
  );
}
{JSON.stringify({
  status: "success",
  device_type: "heat_pump_or_ev",
  recommended_start: todayForecast?.bestWindowStart || "11:00",
  recommended_end: todayForecast?.bestWindowEnd || "14:00",
  avg_price_pln: 0.1245,
  trigger_automation: true
}, null, 2)}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
