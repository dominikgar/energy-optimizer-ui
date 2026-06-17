'use client';

import React, { useState } from 'react';

interface TabApiProps {
  userApiKey: string | null;
}

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="bg-slate-900 text-emerald-400 p-6 rounded-2xl text-sm font-mono overflow-x-auto shadow-inner leading-relaxed whitespace-pre">
      {children}
    </pre>
  );
}

export default function TabApi({ userApiKey }: TabApiProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!userApiKey) return;
    await navigator.clipboard.writeText(userApiKey);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  if (!userApiKey) {
    return (
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 text-center">
        <div className="text-4xl mb-4">🔒</div>
        <h3 className="text-2xl font-bold mb-2">Funkcja PRO</h3>
        <p className="text-slate-500 mb-6">
          API automatyzacji jest dostępne tylko w pakiecie PRO. Aktywuj subskrypcję, aby uzyskać klucz.
        </p>
      </div>
    );
  }

  const scheduleUrl = 'https://energyoptimizer.pl/api/v1/schedule/device';
  const bestWindowUrl = 'https://energyoptimizer.pl/api/v1/forecast/best-window';

  const curlExample = `curl -G "${scheduleUrl}" \\
  -H "Authorization: Bearer ${userApiKey}" \\
  --data-urlencode "day=today" \\
  --data-urlencode "device_name=boiler" \\
  --data-urlencode "energy_kwh=6" \\
  --data-urlencode "power_kw=2" \\
  --data-urlencode "earliest_start=00:00" \\
  --data-urlencode "latest_end=07:00" \\
  --data-urlencode "contiguous=true"`;

  const homeAssistantRest = `rest:
  - resource: "${scheduleUrl}"
    headers:
      Authorization: "Bearer ${userApiKey}"
    params:
      day: today
      device_name: boiler
      energy_kwh: 6
      power_kw: 2
      earliest_start: "00:00"
      latest_end: "07:00"
      contiguous: true
    scan_interval: 300
    binary_sensor:
      - name: "EO Boiler Should Run"
        unique_id: eo_boiler_should_run
        value_template: "{{ value_json.trigger_automation }}"
        icon: mdi:water-boiler
        json_attributes:
          - recommendation_reason
          - active_slot
          - schedule
          - valid_until
    sensor:
      - name: "EO Boiler Schedule Cost"
        unique_id: eo_boiler_schedule_cost
        value_template: "{{ value_json.schedule.total_cost_pln }}"
        unit_of_measurement: "PLN"
        icon: mdi:cash-clock`;

  const homeAssistantAutomation = `automation:
  - alias: "EnergyOptimizer - sterowanie bojlerem"
    id: energyoptimizer_boiler_control
    mode: restart
    trigger:
      - platform: state
        entity_id: binary_sensor.eo_boiler_should_run
      - platform: homeassistant
        event: start
    action:
      - choose:
          - conditions:
              - condition: state
                entity_id: binary_sensor.eo_boiler_should_run
                state: "on"
            sequence:
              - service: switch.turn_on
                target:
                  entity_id: switch.boiler
        default:
          - service: switch.turn_off
            target:
              entity_id: switch.boiler`;

  const legacyRest = `rest:
  - resource: "${bestWindowUrl}"
    headers:
      Authorization: "Bearer ${userApiKey}"
    scan_interval: 900
    sensor:
      - name: "EO Current Price"
        unique_id: eo_current_price
        value_template: "{{ value_json.current_price_pln }}"
        unit_of_measurement: "PLN/kWh"
      - name: "EO Today Best Window Start"
        unique_id: eo_today_window_start
        value_template: "{{ value_json.recommended_start }}"
      - name: "EO Today Best Window End"
        unique_id: eo_today_window_end
        value_template: "{{ value_json.recommended_end }}"`;

  return (
    <div className="space-y-6">
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
        <h2 className="text-2xl font-black mb-3">API automatyzacji</h2>
        <p className="text-slate-600 mb-8 leading-relaxed max-w-4xl">
          API może zwrócić ogólne najtańsze okno albo harmonogram konkretnego urządzenia. Harmonogram uwzględnia wymaganą energię, moc, dostępne godziny oraz pracę ciągłą lub przerywaną.
        </p>

        <div className="mb-8">
          <label className="block text-sm font-bold text-slate-700 mb-2">Twój klucz API — Bearer Token</label>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="password"
              readOnly
              value={userApiKey}
              className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-600 font-mono text-sm focus:outline-none"
            />
            <button
              type="button"
              onClick={handleCopy}
              className="bg-emerald-100 text-emerald-700 px-6 py-3 rounded-xl font-bold hover:bg-emerald-200 transition-colors"
            >
              {copied ? 'Skopiowano!' : 'Kopiuj klucz'}
            </button>
          </div>
          <p className="text-xs text-slate-400 mt-2">Traktuj klucz jak hasło. Nie publikuj pliku konfiguracyjnego zawierającego ten token.</p>
        </div>
      </div>

      <section className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-blue-600 mb-2">Rekomendowane</p>
            <h3 className="text-2xl font-black">Harmonogram konkretnego urządzenia</h3>
            <p className="text-slate-500 mt-2 max-w-3xl leading-6">
              Home Assistant odpytuje endpoint co pięć minut. Pole <code>trigger_automation</code> jest prawdziwe wyłącznie podczas zaplanowanego interwału pracy.
            </p>
          </div>
          <code className="text-xs bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 break-all">GET /api/v1/schedule/device</code>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8 text-sm">
          <div className="rounded-2xl bg-slate-50 border border-slate-200 p-5">
            <strong className="block mb-2">Najważniejsze parametry</strong>
            <p><code>energy_kwh</code> — wymagana energia</p>
            <p><code>power_kw</code> — maksymalna moc</p>
            <p><code>earliest_start</code> / <code>latest_end</code> — dostępne okno</p>
            <p><code>contiguous</code> — praca ciągła lub przerywana</p>
          </div>
          <div className="rounded-2xl bg-slate-50 border border-slate-200 p-5">
            <strong className="block mb-2">Najważniejsze pola odpowiedzi</strong>
            <p><code>trigger_automation</code> — czy urządzenie ma działać teraz</p>
            <p><code>active_slot</code> — aktualnie aktywny interwał</p>
            <p><code>schedule.slots</code> — pełny harmonogram</p>
            <p><code>schedule.total_cost_pln</code> — koszt według RCE</p>
          </div>
        </div>

        <h4 className="font-black text-lg mb-3">Test przez cURL</h4>
        <CodeBlock>{curlExample}</CodeBlock>

        <h4 className="font-black text-lg mt-8 mb-3">configuration.yaml — sensor i sensor binarny</h4>
        <CodeBlock>{homeAssistantRest}</CodeBlock>

        <h4 className="font-black text-lg mt-8 mb-3">Automatyzacja włączająca bojler</h4>
        <p className="text-sm text-slate-500 mb-3">Zmień <code>switch.boiler</code> na identyfikator własnego urządzenia.</p>
        <CodeBlock>{homeAssistantAutomation}</CodeBlock>
      </section>

      <section className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
        <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Tryb prosty</p>
        <h3 className="text-xl font-black mb-3">Ogólne najtańsze okno</h3>
        <p className="text-slate-500 text-sm mb-5">
          Ten endpoint pozostaje dostępny dla starszych konfiguracji i zwraca najlepsze ciągłe okno trzygodzinne bez parametrów konkretnego urządzenia.
        </p>
        <CodeBlock>{legacyRest}</CodeBlock>
      </section>

      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900">
        API opiera harmonogram na surowych cenach RCE. Przed podłączeniem urządzenia dużej mocy sprawdź ograniczenia instalacji, stycznika, zabezpieczeń i producenta urządzenia. EnergyOptimizer nie zastępuje zabezpieczeń elektrycznych ani sterownika urządzenia.
      </div>
    </div>
  );
}
