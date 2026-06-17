'use client';

import React, { useMemo, useState } from 'react';
import {
  API_DEVICE_PRESETS,
  ApiDeviceConfig,
  ApiDevicePresetId,
  buildHomeAssistantYaml,
  buildScheduleCurl
} from '../../lib/apiDevicePresets';

export default function ApiDeviceConfigurator() {
  const [presetId, setPresetId] = useState<ApiDevicePresetId>('boiler');
  const [config, setConfig] = useState<ApiDeviceConfig>({ ...API_DEVICE_PRESETS.boiler });
  const [copied, setCopied] = useState<string | null>(null);

  const choosePreset = (id: ApiDevicePresetId) => {
    setPresetId(id);
    setConfig({ ...API_DEVICE_PRESETS[id] });
  };

  const update = <K extends keyof ApiDeviceConfig>(key: K, value: ApiDeviceConfig[K]) => {
    setConfig((current) => ({ ...current, [key]: value }));
  };

  const yaml = useMemo(() => buildHomeAssistantYaml('<TWÓJ_TOKEN>', config), [config]);
  const curl = useMemo(() => buildScheduleCurl('<TWÓJ_TOKEN>', config), [config]);

  const copy = async (name: string, value: string) => {
    await navigator.clipboard.writeText(value);
    setCopied(name);
    window.setTimeout(() => setCopied(null), 1500);
  };

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 md:p-8 shadow-sm">
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

      <div className="mt-7 grid gap-6 xl:grid-cols-2">
        <div><div className="mb-2 flex justify-between"><strong>configuration.yaml</strong><button type="button" onClick={() => copy('yaml', yaml)} className="text-sm font-bold text-emerald-700">{copied === 'yaml' ? 'Skopiowano' : 'Kopiuj'}</button></div><pre className="overflow-x-auto whitespace-pre rounded-2xl bg-slate-900 p-5 text-sm text-emerald-400">{yaml}</pre></div>
        <div><div className="mb-2 flex justify-between"><strong>Test cURL</strong><button type="button" onClick={() => copy('curl', curl)} className="text-sm font-bold text-emerald-700">{copied === 'curl' ? 'Skopiowano' : 'Kopiuj'}</button></div><pre className="overflow-x-auto whitespace-pre rounded-2xl bg-slate-900 p-5 text-sm text-emerald-400">{curl}</pre></div>
      </div>
    </section>
  );
}
