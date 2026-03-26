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
            <p className="text-slate-500 text-sm mb-4">Wklej ten kod do pliku <code>configuration.yaml</code>, aby utworzyć sensory sterujące pompą ciepła oraz encję cenową dla panelu Energia.</p>
            <pre className="bg-slate-900 text-emerald-400 p-6 rounded-2xl text-sm font-mono overflow-x-auto shadow-inner">
{`rest:
  - resource: "https://twoja-domena.pl/api/v1/forecast/best-window"
    headers:
      Authorization: "Bearer ${userApiKey || 'TWÓJ_KLUCZ'}"
    sensor:
      - name: "Energy Start"
        value_template: "{{ value_json.recommended_start }}"
      - name: "Energy End"
        value_template: "{{ value_json.recommended_end }}"
      - name: "Energy Trigger Automation"
        value_template: "{{ value_json.trigger_automation }}"
      - name: "Current Energy Price"
        value_template: "{{ value_json.current_price_pln }}"
        unit_of_measurement: "PLN/kWh"`}
            </pre>
          </div>

          <div className="bg-slate-900 text-slate-300 p-8 rounded-[32px] flex flex-col font-mono text-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500 rounded-full filter blur-3xl opacity-20"></div>
            <div className="text-slate-500 mb-4">// Podgląd odpowiedzi API na żywo (GET)</div>
            <pre className="text-emerald-300 flex-1 overflow-auto">
{JSON.stringify({
  status: "success",
  device_type: "heat_pump_or_ev",
  recommended_start: todayForecast?.bestWindowStart || "11:00",
  recommended_end: todayForecast?.bestWindowEnd || "14:00",
  avg_price_pln: 0.1245,
  current_price_pln: 0.1500,
  trigger_automation: true
}, null, 2)}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
