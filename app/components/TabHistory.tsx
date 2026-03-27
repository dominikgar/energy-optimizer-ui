'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Chart from '../Chart'; 
import UploadSection from '../UploadSection';

interface TabHistoryProps {
  days: number;
  chartData: any[];
  dataRange?: { min: string | null; max: string | null };
}

export default function TabHistory({ days, chartData, dataRange }: TabHistoryProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  // Funkcja wywoływana po kliknięciu czerwonego przycisku
  const handleDeleteData = async () => {
    // Dodatkowe zabezpieczenie UX przed przypadkowym kliknięciem
    const isConfirmed = window.confirm(
      "RODO: Czy na pewno chcesz TRWALE usunąć całą historię zużycia energii przypisaną do Twojego konta?\n\nTej operacji nie można cofnąć."
    );

    if (!isConfirmed) return;

    setIsDeleting(true);

    try {
      const response = await fetch('/api/delete-history', {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error("Wystąpił błąd podczas usuwania danych.");
      }

      // Sukces - odświeżamy stronę, by wykresy i dane zniknęły
      window.location.reload();
      
    } catch (error) {
      console.error(error);
      alert("Nie udało się usunąć danych. Spróbuj ponownie później.");
      setIsDeleting(false);
    }
  };

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

          {/* NOWA SEKCJA: Usuwanie danych (RODO) */}
          <div className="mt-8 pt-8 border-t border-red-50">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-6 bg-red-50/50 p-6 rounded-2xl border border-red-100">
              <div>
                <h4 className="text-red-800 font-bold mb-1 text-lg">Zarządzanie danymi (RODO)</h4>
                <p className="text-red-600/80 text-sm max-w-md">
                  Jeśli nie chcesz już korzystać z aplikacji, możesz trwale wyczyścić historię swojego zużycia energii z naszych serwerów.
                </p>
              </div>
              <button 
                onClick={handleDeleteData}
                disabled={isDeleting}
                className={`whitespace-nowrap px-6 py-3 bg-red-600 text-white rounded-xl font-bold shadow-md shadow-red-600/20 hover:bg-red-700 hover:shadow-lg transition-all ${isDeleting ? 'opacity-50 cursor-wait scale-95' : ''}`}
              >
                {isDeleting ? 'Usuwanie...' : 'Usuń moje dane'}
              </button>
            </div>
          </div>

        </div>
      ) : (
        <div className="mt-8 bg-white p-8 rounded-[32px] border border-slate-200 shadow-xl shadow-slate-200/40">
          <UploadSection />
        </div>
      )}
    </div>
  );
}