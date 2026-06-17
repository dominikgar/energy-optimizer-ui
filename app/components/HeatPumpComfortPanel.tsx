'use client';

import React, { useMemo, useState } from 'react';
import { DevicePriceInterval } from '../../lib/deviceScheduler';
import { scheduleHeatPumpWithComfort } from '../../lib/heatPumpComfortScheduler';

interface HeatPumpComfortPanelProps {
  intervals: DevicePriceInterval[];
  earliestStart: string;
  latestEnd: string;
  earliestOptions: string[];
  latestOptions: string[];
  onEarliestStartChange: (value: string) => void;
  onLatestEndChange: (value: string) => void;
  overnight: boolean;
  formatDateLabel: (date: string | null) => string;
}

function NumberField({
  label,
  value,
  onChange,
  min,
  max,
  step = 0.1,
  hint
}: {
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
      <input
        type="number"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal"
      />
      {hint && <span className="mt-1 block text-xs font-normal text-slate-500">{hint}</span>}
    </label>
  );
}

export default function HeatPumpComfortPanel({
  intervals,
  earliestStart,
  latestEnd,
  earliestOptions,
  latestOptions,
  onEarliestStartChange,
  onLatestEndChange,
  overnight,
  formatDateLabel
}: HeatPumpComfortPanelProps) {
  const [initialTemp, setInitialTemp] = useState(21);
  const [minimumTemp, setMinimumTemp] = useState(20.5);
  const [targetEndTemp, setTargetEndTemp] = useState(21);
  const [maximumPreheatTemp, setMaximumPreheatTemp] = useState(22);
  const [thermalCapacity, setThermalCapacity] = useState(10);
  const [heatLoss, setHeatLoss] = useState(2);
  const [cop, setCop] = useState(3.2);
  const [maxElectricalPower, setMaxElectricalPower] = useState(3);

  const result = useMemo(() => scheduleHeatPumpWithComfort(intervals, {
    initialIndoorTempC: initialTemp,
    minimumComfortTempC: minimumTemp,
    targetEndTempC: targetEndTemp,
    maximumPreheatTempC: maximumPreheatTemp,
    thermalCapacityKwhPerC: thermalCapacity,
    heatLossKw: heatLoss,
    cop,
    maxElectricalPowerKw: maxElectricalPower,
    earliestStart,
    latestEnd
  }), [
    intervals,
    initialTemp,
    minimumTemp,
    targetEndTemp,
    maximumPreheatTemp,
    thermalCapacity,
    heatLoss,
    cop,
    maxElectricalPower,
    earliestStart,
    latestEnd
  ]);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-orange-200 bg-orange-50 p-5">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3 mb-5">
          <div>
            <h3 className="font-black text-orange-950 text-lg">Komfort i bezwładność cieplna</h3>
            <p className="mt-2 text-sm leading-6 text-orange-900 max-w-3xl">
              Model traktuje budynek jak magazyn ciepła. Pompa może podgrzać go wcześniej, ale temperatura nie może spaść poniżej minimum ani przekroczyć limitu podgrzania.
            </p>
          </div>
          <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-orange-700 border border-orange-200">MODEL UPROSZCZONY</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <NumberField label="Temperatura początkowa [°C]" value={initialTemp} onChange={setInitialTemp} min={5} max={35} />
          <NumberField label="Minimum komfortu [°C]" value={minimumTemp} onChange={setMinimumTemp} min={5} max={35} />
          <NumberField label="Temperatura na końcu [°C]" value={targetEndTemp} onChange={setTargetEndTemp} min={5} max={35} />
          <NumberField label="Maks. podgrzanie [°C]" value={maximumPreheatTemp} onChange={setMaximumPreheatTemp} min={5} max={35} />
          <NumberField label="Pojemność cieplna [kWh/°C]" value={thermalCapacity} onChange={setThermalCapacity} min={0.1} max={500} hint="Ile energii potrzeba, aby podnieść temperaturę budynku o 1°C." />
          <NumberField label="Średnia strata ciepła [kW]" value={heatLoss} onChange={setHeatLoss} min={0} max={100} hint="Stała strata dla analizowanego okna." />
          <NumberField label="COP" value={cop} onChange={setCop} min={1} max={10} />
          <NumberField label="Maks. moc elektryczna [kW]" value={maxElectricalPower} onChange={setMaxElectricalPower} min={0.1} max={50} />
          <label className="text-sm font-bold text-slate-700">
            Najwcześniejszy start
            <select value={earliestStart} onChange={(event) => onEarliestStartChange(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal bg-white">
              {earliestOptions.map((time) => <option key={time} value={time}>{time}</option>)}
            </select>
          </label>
          <label className="text-sm font-bold text-slate-700">
            Modeluj do
            <select value={latestEnd} onChange={(event) => onLatestEndChange(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal bg-white">
              {latestOptions.map((time) => <option key={time} value={time}>{time}</option>)}
            </select>
            {overnight && <span className="mt-1 block text-xs font-normal text-blue-600">Ta godzina przypada następnego dnia.</span>}
          </label>
        </div>

        <p className="mt-5 text-xs leading-5 text-orange-800">
          Wynik zależy od oszacowanej pojemności cieplnej i strat budynku. Nie jest to symulacja audytowa ani regulator pogodowy; model zakłada stałe straty i stały COP w całym oknie.
        </p>
      </div>

      {result.feasible ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="p-5 bg-emerald-50 rounded-2xl border border-emerald-100">
              <span className="text-xs uppercase font-bold text-emerald-600">Koszt RCE</span>
              <strong className="block mt-2 text-2xl text-emerald-700">{result.totalCost.toFixed(2)} PLN</strong>
            </div>
            <div className="p-5 bg-blue-50 rounded-2xl border border-blue-100">
              <span className="text-xs uppercase font-bold text-blue-600">Energia z sieci</span>
              <strong className="block mt-2 text-2xl text-blue-700">{result.totalElectricalEnergyKwh.toFixed(2)} kWh</strong>
            </div>
            <div className="p-5 bg-white rounded-2xl border border-slate-200">
              <span className="text-xs uppercase font-bold text-slate-400">Minimum temperatury</span>
              <strong className="block mt-2 text-2xl">{result.minimumProjectedTempC.toFixed(2)}°C</strong>
            </div>
            <div className="p-5 bg-white rounded-2xl border border-slate-200">
              <span className="text-xs uppercase font-bold text-slate-400">Temperatura końcowa</span>
              <strong className="block mt-2 text-2xl">{result.endTemperatureC.toFixed(2)}°C</strong>
            </div>
            <div className="p-5 bg-white rounded-2xl border border-slate-200">
              <span className="text-xs uppercase font-bold text-slate-400">Praca równoważna</span>
              <strong className="block mt-2 text-2xl">{result.equivalentRuntimeHours.toFixed(2)} h</strong>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <h4 className="font-black mb-4">Interwały pracy pompy</h4>
            {result.heatingIntervals.length === 0 ? (
              <p className="text-sm text-slate-500">W tym oknie budynek utrzymuje komfort bez uruchamiania pompy.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-400">
                      <th className="py-3 pr-4">Interwał</th>
                      <th className="py-3 pr-4">Moc</th>
                      <th className="py-3 pr-4">Temperatura</th>
                      <th className="py-3 pr-4">Energia</th>
                      <th className="py-3">Koszt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.heatingIntervals.map((interval, index) => (
                      <tr key={`${interval.startDate}-${interval.start}-${index}`} className="border-b border-slate-100 last:border-0">
                        <td className="py-3 pr-4 font-bold">{formatDateLabel(interval.startDate)} {interval.start}–{interval.end}</td>
                        <td className="py-3 pr-4">{interval.electricalPowerKw.toFixed(2)} kW ({Math.round(interval.powerFraction * 100)}%)</td>
                        <td className="py-3 pr-4">{interval.temperatureStartC.toFixed(2)} → {interval.temperatureEndC.toFixed(2)}°C</td>
                        <td className="py-3 pr-4">{interval.electricalEnergyKwh.toFixed(3)} kWh</td>
                        <td className="py-3 font-bold">{interval.cost.toFixed(3)} PLN</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 font-semibold text-red-800">
          {result.reason}
        </div>
      )}
    </div>
  );
}
