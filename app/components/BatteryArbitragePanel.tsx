'use client';

import React, { useMemo, useState } from 'react';
import { DevicePriceInterval } from '../../lib/deviceScheduler';
import { scheduleBatteryArbitrage } from '../../lib/batteryArbitrageScheduler';

interface Props {
  intervals: DevicePriceInterval[];
  earliestStart: string;
  latestEnd: string;
  earliestOptions: string[];
  latestOptions: string[];
  onEarliestStartChange: (value: string) => void;
  onLatestEndChange: (value: string) => void;
  overnight: boolean;
}

function timeToMinutes(time: string): number {
  if (time === '24:00') return 1440;
  const [hour, minute] = time.split(':').map(Number);
  return hour * 60 + minute;
}

function isInsideSolarWindow(time: string, start: string, end: string): boolean {
  const value = timeToMinutes(time);
  return value >= timeToMinutes(start) && value < timeToMinutes(end);
}

function NumberField({ label, value, onChange, min, max, step = 0.1, hint }: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  hint?: string;
}) {
  return (
    <label className="text-sm font-bold text-slate-700">
      {label}
      <input type="number" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal" />
      {hint && <span className="mt-1 block text-xs font-normal text-slate-500">{hint}</span>}
    </label>
  );
}

export default function BatteryArbitragePanel({
  intervals,
  earliestStart,
  latestEnd,
  earliestOptions,
  latestOptions,
  onEarliestStartChange,
  onLatestEndChange,
  overnight
}: Props) {
  const [capacity, setCapacity] = useState(10);
  const [initialSoc, setInitialSoc] = useState(40);
  const [minimumSoc, setMinimumSoc] = useState(10);
  const [targetEndSoc, setTargetEndSoc] = useState(40);
  const [maxChargePower, setMaxChargePower] = useState(5);
  const [maxDischargePower, setMaxDischargePower] = useState(5);
  const [chargeEfficiency, setChargeEfficiency] = useState(94);
  const [dischargeEfficiency, setDischargeEfficiency] = useState(94);
  const [wearCost, setWearCost] = useState(0.08);
  const [householdLoad, setHouseholdLoad] = useState(0.6);
  const [pvPower, setPvPower] = useState(3);
  const [pvStart, setPvStart] = useState('10:00');
  const [pvEnd, setPvEnd] = useState('16:00');
  const [allowGridCharging, setAllowGridCharging] = useState(true);
  const [allowExport, setAllowExport] = useState(false);
  const [exportFactor, setExportFactor] = useState(0.8);

  const result = useMemo(() => scheduleBatteryArbitrage(
    intervals.map((interval) => ({
      ...interval,
      householdLoadKw: householdLoad,
      pvGenerationKw: isInsideSolarWindow(interval.start, pvStart, pvEnd) ? pvPower : 0
    })),
    {
      usableCapacityKwh: capacity,
      initialSocPercent: initialSoc,
      minimumSocPercent: minimumSoc,
      targetEndSocPercent: targetEndSoc,
      maxChargePowerKw: maxChargePower,
      maxDischargePowerKw: maxDischargePower,
      chargeEfficiencyPercent: chargeEfficiency,
      dischargeEfficiencyPercent: dischargeEfficiency,
      batteryWearCostPerKwh: wearCost,
      allowGridCharging,
      allowExport,
      exportPriceFactor: exportFactor,
      earliestStart,
      latestEnd
    }
  ), [
    intervals,
    householdLoad,
    pvPower,
    pvStart,
    pvEnd,
    capacity,
    initialSoc,
    minimumSoc,
    targetEndSoc,
    maxChargePower,
    maxDischargePower,
    chargeEfficiency,
    dischargeEfficiency,
    wearCost,
    allowGridCharging,
    allowExport,
    exportFactor,
    earliestStart,
    latestEnd
  ]);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-violet-200 bg-violet-50 p-5">
        <div className="flex flex-col md:flex-row md:justify-between gap-3 mb-5">
          <div>
            <h3 className="text-lg font-black text-violet-950">Magazyn, PV i arbitraż</h3>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-violet-900">
              Model minimalizuje koszt importu, może magazynować nadwyżkę PV i rozładowywać baterię w drogich godzinach. Koszt zużycia baterii jest doliczany do każdego przepływu energii.
            </p>
          </div>
          <span className="h-fit rounded-full border border-violet-200 bg-white px-3 py-1 text-xs font-black text-violet-700">MODEL PRZYBLIŻONY</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <NumberField label="Pojemność użyteczna [kWh]" value={capacity} onChange={setCapacity} min={0.1} max={500} />
          <NumberField label="Początkowy SoC [%]" value={initialSoc} onChange={setInitialSoc} min={0} max={100} step={1} />
          <NumberField label="Minimalny SoC [%]" value={minimumSoc} onChange={setMinimumSoc} min={0} max={100} step={1} />
          <NumberField label="Końcowy SoC [%]" value={targetEndSoc} onChange={setTargetEndSoc} min={0} max={100} step={1} />
          <NumberField label="Maks. moc ładowania [kW]" value={maxChargePower} onChange={setMaxChargePower} min={0.1} max={100} />
          <NumberField label="Maks. moc rozładowania [kW]" value={maxDischargePower} onChange={setMaxDischargePower} min={0.1} max={100} />
          <NumberField label="Sprawność ładowania [%]" value={chargeEfficiency} onChange={setChargeEfficiency} min={1} max={100} step={1} />
          <NumberField label="Sprawność rozładowania [%]" value={dischargeEfficiency} onChange={setDischargeEfficiency} min={1} max={100} step={1} />
          <NumberField label="Koszt zużycia [PLN/kWh]" value={wearCost} onChange={setWearCost} min={0} max={5} step={0.01} hint="Koszt degradacji dla energii przepływającej przez baterię." />
          <NumberField label="Średnie obciążenie domu [kW]" value={householdLoad} onChange={setHouseholdLoad} min={0} max={100} />
          <NumberField label="Moc PV w oknie [kW]" value={pvPower} onChange={setPvPower} min={0} max={500} />
          <label className="text-sm font-bold text-slate-700">Okno PV od
            <select value={pvStart} onChange={(event) => setPvStart(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 font-normal">{earliestOptions.map((time) => <option key={time} value={time}>{time}</option>)}</select>
          </label>
          <label className="text-sm font-bold text-slate-700">Okno PV do
            <select value={pvEnd} onChange={(event) => setPvEnd(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 font-normal">{latestOptions.map((time) => <option key={time} value={time}>{time}</option>)}</select>
          </label>
          <label className="text-sm font-bold text-slate-700">Analizuj od
            <select value={earliestStart} onChange={(event) => onEarliestStartChange(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 font-normal">{earliestOptions.map((time) => <option key={time} value={time}>{time}</option>)}</select>
          </label>
          <label className="text-sm font-bold text-slate-700">Analizuj do
            <select value={latestEnd} onChange={(event) => onLatestEndChange(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 font-normal">{latestOptions.map((time) => <option key={time} value={time}>{time}</option>)}</select>
            {overnight && <span className="mt-1 block text-xs font-normal text-blue-600">Ta godzina przypada następnego dnia.</span>}
          </label>
          <NumberField label="Cena eksportu × RCE" value={exportFactor} onChange={setExportFactor} min={0} max={1} step={0.05} />
        </div>

        <div className="mt-5 flex flex-wrap gap-5 text-sm font-semibold text-violet-950">
          <label className="flex items-center gap-2"><input type="checkbox" checked={allowGridCharging} onChange={(event) => setAllowGridCharging(event.target.checked)} /> Zezwól na ładowanie z sieci</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={allowExport} onChange={(event) => setAllowExport(event.target.checked)} /> Zezwól na eksport do sieci</label>
        </div>
        <p className="mt-4 text-xs leading-5 text-violet-800">PV jest modelowane jako stała moc w wybranym oknie, a obciążenie domu jako stała średnia. To scenariusz, nie prognoza produkcji ani zużycia.</p>
      </div>

      {result.feasible ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5"><span className="text-xs font-bold uppercase text-slate-400">Bez magazynu</span><strong className="mt-2 block text-2xl">{result.baselineCostPln.toFixed(2)} PLN</strong></div>
            <div className="rounded-2xl border border-violet-100 bg-violet-50 p-5"><span className="text-xs font-bold uppercase text-violet-600">Z magazynem</span><strong className="mt-2 block text-2xl text-violet-700">{result.optimizedCostPln.toFixed(2)} PLN</strong></div>
            <div className={`rounded-2xl border p-5 ${result.savingsPln >= 0 ? 'border-emerald-100 bg-emerald-50' : 'border-red-100 bg-red-50'}`}><span className={`text-xs font-bold uppercase ${result.savingsPln >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>Wynik</span><strong className={`mt-2 block text-2xl ${result.savingsPln >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>{result.savingsPln.toFixed(2)} PLN</strong></div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5"><span className="text-xs font-bold uppercase text-slate-400">Import</span><strong className="mt-2 block text-2xl">{result.totalGridImportKwh.toFixed(2)} kWh</strong></div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5"><span className="text-xs font-bold uppercase text-slate-400">Końcowy SoC</span><strong className="mt-2 block text-2xl">{result.endSocPercent.toFixed(1)}%</strong></div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <h4 className="mb-4 font-black">Aktywne interwały magazynu</h4>
            {result.activeSteps.length === 0 ? <p className="text-sm text-slate-500">Przy tych parametrach najbardziej opłacalny jest brak cyklu.</p> : (
              <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-400"><th className="py-3 pr-4">Interwał</th><th className="py-3 pr-4">Działanie</th><th className="py-3 pr-4">SoC</th><th className="py-3 pr-4">Sieć</th><th className="py-3">Koszt netto</th></tr></thead><tbody>{result.activeSteps.map((step, index) => <tr key={`${step.date}-${step.start}-${index}`} className="border-b border-slate-100 last:border-0"><td className="py-3 pr-4 font-bold">{step.date || ''} {step.start}–{step.end}</td><td className="py-3 pr-4">{step.action === 'charge' ? 'Ładowanie' : 'Rozładowanie'} {Math.abs(step.batteryPowerKw).toFixed(2)} kW</td><td className="py-3 pr-4">{step.socStartPercent.toFixed(1)} → {step.socEndPercent.toFixed(1)}%</td><td className="py-3 pr-4">import {step.gridImportKwh.toFixed(2)} / eksport {step.gridExportKwh.toFixed(2)} kWh</td><td className="py-3 font-bold">{step.netCostPln.toFixed(3)} PLN</td></tr>)}</tbody></table></div>
            )}
          </div>
        </>
      ) : <div className="rounded-2xl border border-red-200 bg-red-50 p-5 font-semibold text-red-800">{result.reason}</div>}
    </div>
  );
}
