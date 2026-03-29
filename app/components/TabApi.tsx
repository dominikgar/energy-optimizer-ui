import React, { useState } from 'react';
import { useUser } from '@clerk/nextjs';

interface TabApiProps {
  userApiKey: string | null;
}

export default function TabApi({ userApiKey }: TabApiProps) {
  const { user } = useUser();
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (userApiKey) {
      navigator.clipboard.writeText(userApiKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!userApiKey) {
    return (
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 text-center">
        <div className="text-4xl mb-4">🔒</div>
        <h3 className="text-2xl font-bold mb-2">Funkcja Premium</h3>
        <p className="text-slate-500 mb-6">
          API automatyzacji jest dostępne tylko w pakiecie PRO. Aktywuj go, aby uzyskać klucz.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
        <h2 className="text-2xl font-black mb-6">Automatyzacja Smart Home</h2>
        <p className="text-slate-600 mb-8 leading-relaxed">
          Twój klucz API pozwala na bezpieczną komunikację z naszym serwerem predykcyjnym. Użyj go, aby pobierać najtańsze okna taryfowe z wyprzedzeniem 24-godzinnym i automatyzować działanie pompy ciepła, klimatyzacji lub bojlera w Twoim Home Assistant.
        </p>

        <div className="mb-8">
          <label className="block text-sm font-bold text-slate-700 mb-2">Twój unikalny klucz API (Bearer Token)</label>
          <div className="flex gap-2">
            <input 
              type="text" 
              readOnly 
              value={userApiKey} 
              className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-600 font-mono text-sm focus:outline-none"
            />
            <button 
              onClick={handleCopy}
              className="bg-emerald-100 text-emerald-700 px-6 py-3 rounded-xl font-bold hover:bg-emerald-200 transition-colors"
            >
              {copied ? 'Skopiowano!' : 'Kopiuj'}
            </button>
          </div>
          <p className="text-xs text-slate-400 mt-2">Traktuj ten klucz jak hasło. Nie udostępniaj go publicznie.</p>
        </div>

        <div className="border-t border-slate-100 pt-8 mt-8">
          <h3 className="text-xl font-bold mb-4">Konfiguracja Home Assistant</h3>
          <p className="text-slate-500 text-sm mb-4">Wklej ten kod do pliku <code>configuration.yaml</code>, aby utworzyć pełen zestaw profesjonalnych sensorów predykcyjnych (łącznie z cenami na jutro!).</p>
          <pre className="bg-slate-900 text-emerald-400 p-6 rounded-2xl text-sm font-mono overflow-x-auto shadow-inner leading-relaxed">
{`rest:
  - resource: "https://www.energyoptimizer.pl/api/v1/forecast/best-window"
    headers:
      Authorization: "Bearer ${userApiKey}"
    scan_interval: 3600 # Refresh every hour
    sensor:
      # --- CURRENT PRICE ---
      - name: "EO Current Price"
        unique_id: "eo_current_price"
        value_template: "{{ value_json.current_price_pln }}"
        unit_of_measurement: "PLN/kWh"
        icon: mdi:currency-pln
      
      # --- TODAY'S DATA ---
      - name: "EO Today: Best Window Start"
        unique_id: "eo_today_window_start"
        value_template: "{{ value_json.recommended_start }}"
        icon: mdi:clock-start
      
      - name: "EO Today: Best Window End"
        unique_id: "eo_today_window_end"
        value_template: "{{ value_json.recommended_end }}"
        icon: mdi:clock-end
        
      - name: "EO Today: Best Window Avg Price"
        unique_id: "eo_today_window_avg_price"
        value_template: "{{ value_json.avg_price_pln }}"
        unit_of_measurement: "PLN/kWh"
        icon: mdi:chart-bell-curve-cumulative
        
      # --- TOMORROW'S DATA (Published by PSE around 13:00 CET) ---
      - name: "EO Tomorrow: Data Status"
        unique_id: "eo_tomorrow_available"
        value_template: "{{ 'Available' if value_json.tomorrow_data_available else 'Pending' }}"
        icon: mdi:database-clock
        
      - name: "EO Tomorrow: Best Window Start"
        unique_id: "eo_tomorrow_window_start"
        value_template: "{{ value_json.tomorrow_recommended_start if value_json.tomorrow_data_available else 'No data' }}"
        icon: mdi:clock-start
        
      - name: "EO Tomorrow: Best Window End"
        unique_id: "eo_tomorrow_window_end"
        value_template: "{{ value_json.tomorrow_recommended_end if value_json.tomorrow_data_available else 'No data' }}"
        icon: mdi:clock-end
`}
          </pre>
        </div>
      </div>
    </div>
  );
}