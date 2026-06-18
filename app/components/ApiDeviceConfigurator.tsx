'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  API_DEVICE_PRESETS,
  EXECUTION_REPORTING_DEFAULTS,
  ApiDeviceConfig,
  ApiDevicePresetId,
  ExecutionReportingConfig,
  buildHomeAssistantExecutionYaml,
  buildHomeAssistantYaml,
  buildScheduleCurl
} from '../../lib/apiDevicePresets';

export default function ApiDeviceConfigurator() {
  const [presetId, setPresetId] = useState<ApiDevicePresetId>('boiler');
  const [config, setConfig] = useState<ApiDeviceConfig>({ ...API_DEVICE_PRESETS.boiler });
  const [reporting, setReporting] = useState<ExecutionReportingConfig>({ ...EXECUTION_REPORTING_DEFAULTS.boiler });
  const [copied, setCopied] = useState<string | null>(null);

  const choosePreset = (id: ApiDevicePresetId) => {
    setPresetId(id);
    setConfig({ ...API_DEVICE_PRESETS[id] });
    setReporting({ ...EXECUTION_REPORTING_DEFAULTS[id] });
  };

  const update = <K extends keyof ApiDeviceConfig>(key: K, value: ApiDeviceConfig[K]) => {
    setConfig((current) => ({ ...current, [key]: value }));
  };

  const updateReporting = <K extends keyof ExecutionReportingConfig>(key: K, value: ExecutionReportingConfig[K]) => {
    setReporting((current) => ({ ...current, [key]: value }));
  };

  const yaml = useMemo(() => buildHomeAssistantYaml('<TWÓJ_TOKEN>', config), [config]);
  const curl = useMemo(() => buildScheduleCurl('<TWÓJ_TOKEN>', config), [config]);
  const executionYaml = useMemo(
    () => buildHomeAssistantExecutionYaml('<TWÓJ_TOKEN>', config, reporting),
    [config, reporting]
  );

  const copy = async (name: string, value: string) => {
    await navigator.clipboard.writeText(value);
    setCopied(name);
    window.setTimeout(() => setCopied(null), 1500);
  };

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
        <h3 className="text-2xl font-black">Konfigurator Home Assistanta</h3>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Wybierz urządzenie, popraw parametry i wklej zapisany token w zaznaczone miejsce.
        </p>

        <div className="mt-5 flex flex-wrap gap-2">
          {(Object.keys(API_DEVICE_PRESETS) as ApiDevicePresetId[]).map((id) => (
            <button key={id} type="button" onClick={() => choosePreset(id)} className={`rounded-full border px-4 py-2 text-sm font-bold ${presetId === id ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-200 text-slate-600'}`}>
              {API_DEVICE_PRESETS[id].label}
            </button>
          ))}
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-sm font-bold">Dzień
            <select value={config.day} onChange={(event) => update('day', event.target.value as ApiDeviceConfig['day'])} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 font-normal">
              <option value="today">Dzisiaj</option><option value="tomorrow">Jutro</option>
            </select>
          </label>
          <label className="text-sm font-bold">Identyfikator
            <input value={config.deviceName} onChange={(event) => update('deviceName', event.target.value.replace(/[^a-zA-Z0-9_-]/g, '_'))} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-mono font-normal" />
          </label>
          <label className="text-sm font-bold">Nazwa sensora
            <input value={config.sensorName} onChange={(event) => update('sensorName', event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal" />
          </label>
          <label className="text-sm font-bold">Tryb
            <select value={String(config.contiguous)} onChange={(event) => update('contiguous', event.target.value === 'true')} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 font-normal">
              <option value="true">Praca ciągła</option><option value="false">Można przerywać</option>
            </select>
          </label>
          <label className="text-sm font-bold">Energia [kWh]
            <input type="number" min="0.1" step="0.1" value={config.energyKwh} onChange={(event) => update('energyKwh', Number(event.target.value))} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal" />
          </label>
          <label className="text-sm font-bold">Moc [kW]
            <input type="number" min="0.1" step="0.1" value={config.powerKw} onChange={(event) => update('powerKw', Number(event.target.value))} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal" />
          </label>
          <label className="text-sm font-bold">Start
            <input value={config.earliestStart} onChange={(event) => update('earliestStart', event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-mono font-normal" />
          </label>
          <label className="text-sm font-bold">Koniec
            <input value={config.latestEnd} onChange={(event) => update('latestEnd', event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-mono font-normal" />
          </label>
        </div>

        <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          Generator celowo nie wstawia tokenu automatycznie. Zastąp znacznik &lt;TWÓJ_TOKEN&gt; wartością przechowywaną w Home Assistant.
        </p>

        <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm leading-6 text-blue-900">
          Konfiguracja tworzy dwie encje: binary sensor sterujący automatyzacją oraz sensor z harmonogramem i diagnostyką. Gdy PSE nie opublikowało jeszcze cen potrzebnych dla okna nocnego, encje pozostają dostępne, automatyzacja ma stan <strong>off</strong>, a sensor pokazuje <strong>Oczekiwanie na ceny PSE</strong>.
        </div>

        <div className="mt-7 grid gap-6 xl:grid-cols-2">
          <div><div className="mb-2 flex justify-between"><strong>configuration.yaml</strong><button type="button" onClick={() => copy('yaml', yaml)} className="text-sm font-bold text-emerald-700">{copied === 'yaml' ? 'Skopiowano' : 'Kopiuj'}</button></div><pre className="overflow-x-auto whitespace-pre rounded-2xl bg-slate-900 p-5 text-sm text-emerald-400">{yaml}</pre></div>
          <div><div className="mb-2 flex justify-between"><strong>Test cURL</strong><button type="button" onClick={() => copy('curl', curl)} className="text-sm font-bold text-emerald-700">{copied === 'curl' ? 'Skopiowano' : 'Kopiuj'}</button></div><pre className="overflow-x-auto whitespace-pre rounded-2xl bg-slate-900 p-5 text-sm text-emerald-400">{curl}</pre></div>
        </div>
      </section>

      <section className="rounded-3xl border border-emerald-200 bg-white p-6 shadow-sm md:p-8">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-widest text-emerald-600">Opcjonalne · PRO</p>
            <h3 className="mt-1 text-2xl font-black">Raportowanie faktycznych oszczędności</h3>
            <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600">
              Harmonogram wyżej mówi, kiedy urządzenie powinno pracować. Ten dodatkowy kod zgłasza do EnergyOptimizer rzeczywisty start i koniec pracy, dzięki czemu dashboard Oszczędności pokazuje wykonane cykle, energię, koszt i wynik względem stawki odniesienia.
            </p>
          </div>
          <Link href="/savings" className="h-fit rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-700 hover:bg-emerald-100">
            Otwórz dashboard →
          </Link>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-sm font-bold">Sposób pomiaru energii
            <select value={reporting.mode} onChange={(event) => updateReporting('mode', event.target.value as ExecutionReportingConfig['mode'])} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 font-normal">
              <option value="meter">Licznik energii kWh</option>
              <option value="estimated">Estymacja moc × czas</option>
            </select>
          </label>
          <label className="text-sm font-bold">Encja stanu urządzenia
            <input value={reporting.triggerEntityId} onChange={(event) => updateReporting('triggerEntityId', event.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, '_'))} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-mono font-normal" placeholder="switch.dishwasher" />
          </label>
          <label className="text-sm font-bold">Stawka odniesienia [zł/kWh]
            <input type="number" min="0" step="0.01" value={reporting.referenceRatePlnKwh} onChange={(event) => updateReporting('referenceRatePlnKwh', Number(event.target.value))} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal" />
          </label>
          <label className="text-sm font-bold">Opóźnienie końca [sekundy]
            <input type="number" min="0" max="86400" step="10" value={reporting.stopDelaySeconds} onChange={(event) => updateReporting('stopDelaySeconds', Number(event.target.value))} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal" />
          </label>
          {reporting.mode === 'meter' && (
            <label className="text-sm font-bold sm:col-span-2">Encja licznika narastającego [kWh]
              <input value={reporting.meterEntityId} onChange={(event) => updateReporting('meterEntityId', event.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, '_'))} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-mono font-normal" placeholder="sensor.dishwasher_energy_total" />
            </label>
          )}
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-700"><strong>1. Start</strong><br />HA zapisuje godzinę startu oraz początkowy stan licznika albo moc urządzenia.</div>
          <div className="rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-700"><strong>2. Stop</strong><br />HA przesyła godzinę końca i końcowy stan licznika. Serwer wylicza energię.</div>
          <div className="rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-700"><strong>3. Wynik</strong><br />Cykl trafia do <Link href="/savings" className="font-bold text-emerald-700 underline">dashboardu Oszczędności</Link>.</div>
        </div>

        <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
          Encja stanu musi odzwierciedlać <strong>rzeczywistą pracę urządzenia</strong>, a nie samą rekomendację EO. Jeżeli masz już w pliku nagłówki <code>rest_command:</code> albo <code>automation:</code>, dodaj pod nimi wygenerowane elementy — nie twórz drugiego identycznego nagłówka.
        </div>

        <div className="mt-6">
          <div className="mb-2 flex items-center justify-between gap-3">
            <strong>configuration.yaml — raportowanie start/stop</strong>
            <button type="button" onClick={() => copy('execution', executionYaml)} className="text-sm font-bold text-emerald-700">{copied === 'execution' ? 'Skopiowano' : 'Kopiuj'}</button>
          </div>
          <pre className="overflow-x-auto whitespace-pre rounded-2xl bg-slate-900 p-5 text-sm text-emerald-400">{executionYaml}</pre>
        </div>
      </section>
    </div>
  );
}
