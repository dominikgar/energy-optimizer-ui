'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { buildHomeAssistantSavingsSummaryYaml } from '../../lib/homeAssistantSavingsSummary';

export default function SavingsSummaryConfigurator() {
  const [scanInterval, setScanInterval] = useState(900);
  const [copied, setCopied] = useState(false);
  const yaml = useMemo(
    () => buildHomeAssistantSavingsSummaryYaml('<TWÓJ_TOKEN>', scanInterval),
    [scanInterval]
  );

  const copy = async () => {
    await navigator.clipboard.writeText(yaml);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  return (
    <section className="rounded-3xl border border-violet-200 bg-white p-6 shadow-sm md:p-8">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm font-black uppercase tracking-widest text-violet-600">Home Assistant · PRO</p>
          <h3 className="mt-1 text-2xl font-black">Sensory podsumowania oszczędności</h3>
          <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600">
            Pełna historia pozostaje w EnergyOptimizer, a najważniejsze liczby możesz wyświetlić bezpośrednio w Home Assistant. Jeden lekki endpoint tworzy osobne encje bez przesyłania całej historii cykli do atrybutów.
          </p>
        </div>
        <Link href="/dashboardy#oszczednosci" className="h-fit rounded-xl border border-violet-200 bg-violet-50 px-4 py-2 text-sm font-bold text-violet-700 hover:bg-violet-100">
          Jak to działa? →
        </Link>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[260px_1fr]">
        <label className="text-sm font-bold">Odświeżanie [sekundy]
          <input type="number" min="300" max="86400" step="60" value={scanInterval} onChange={(event) => setScanInterval(Number(event.target.value))} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal" />
          <span className="mt-2 block text-xs font-normal leading-5 text-slate-500">Minimum 300 s. Domyślnie 900 s, czyli co 15 minut.</span>
        </label>
        <div className="rounded-2xl bg-slate-50 p-5 text-sm leading-6 text-slate-700">
          Powstaną encje dla oszczędności łącznej i miesięcznej, przesuniętej energii, liczby cykli, ostatniego wyniku oraz aktywnych wykonań. Szczegółowe rekordy pozostają w <Link href="/savings" className="font-bold text-violet-700 underline">/savings</Link>, dzięki czemu Recorder Home Assistanta nie zapisuje rozbudowanej historii w atrybutach.
        </div>
      </div>

      <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
        Wygenerowany kod jest pojedynczym elementem listy. Wklej go <strong>pod istniejącym nagłówkiem <code>rest:</code></strong>, obok konfiguracji harmonogramu. Nie twórz drugiego nagłówka <code>rest:</code>.
      </div>

      <div className="mt-6">
        <div className="mb-2 flex items-center justify-between gap-3">
          <strong>configuration.yaml — sensory oszczędności</strong>
          <button type="button" onClick={copy} className="text-sm font-bold text-violet-700">{copied ? 'Skopiowano' : 'Kopiuj'}</button>
        </div>
        <pre className="overflow-x-auto whitespace-pre rounded-2xl bg-slate-900 p-5 text-sm text-violet-300">{yaml}</pre>
      </div>
    </section>
  );
}
