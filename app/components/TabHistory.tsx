import React from 'react';
import Link from 'next/link';
// ZMIANA: Poprawione ścieżki wyjścia o jeden folder wyżej
import Chart from '../Chart';
import UploadSection from '../UploadSection';

interface TabHistoryProps {
  days: number;
  chartData: any[];
  dataRange?: { min: string | null; max: string | null };
}

export default function TabHistory({ days, chartData, dataRange }: TabHistoryProps) {
  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h2 className="text-3xl font-black">Profil Zużycia</h2>
          {dataRange?.min && (
            <p className="text-slate-500 mt-2 text-sm font-medium">
              Dane w bazie obejmują okres: <strong className="text-blue-600">{dataRange.min} - {dataRange.max}</strong>
            </p>
          )}
        </div>
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
