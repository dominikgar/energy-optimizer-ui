'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { scheduleDevice } from '../../lib/deviceScheduler';

interface PlannerForecast {
  date: string;
  label: string;
  intervalMinutes: number;
  prices: { time: string; pricePerKwh: number }[];
}

interface TabPlannerProps {
  isPremiumUser: boolean;
  todayForecast: PlannerForecast | null;
  tomorrowForecast: PlannerForecast | null;
  forecastError: string | null;
}

type DevicePreset = 'boiler' | 'ev' | 'dishwasher' | 'custom';

const PRESETS: Record<DevicePreset, {
  label: string;
  energy: number;
  power: number;
  contiguous: boolean;
}> = {
  boiler: { label: 'Bojler', energy: 6, power: 2, contiguous: true },
  ev: { label: 'Samochód elektryczny', energy: 20, power: 7.4, contiguous: false },
  dishwasher: { label: 'Zmywarka / pralka', energy: 1.5, power: 1, contiguous: true },
  custom: { label: 'Urządzenie własne', energy: 5, power: 2, contiguous: true }
};

function formatTime(minutes: number): string {
  if (minutes >= 1440) return '24:00';
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}

function timeToMinutes(time: string): number {
  if (time === '24:00') return 1440;
  const [hour, minute] = time.split(':').map(Number);
  return hour * 60 + minute;
}

function crossesMidnight(earliestStart: string, latestEnd: string): boolean {
  return latestEnd !== '24:00' && timeToMinutes(latestEnd) <= timeToMinutes(earliestStart);
}

function formatDateLabel(date: string | null): string {
  if (!date) return '';
  const [year, month, day] = date.split('-');
  return `${day}.${month}.${year}`;
}

function buildTimeOptions(intervalMinutes: number, includeEnd: boolean): string[] {
  const options: string[] = [];
  const start = includeEnd ? 0 : 0;
  const end = includeEnd ? 1440 : 1440 - intervalMinutes;
  for (let minute = start; minute <= end; minute += intervalMinutes) {
    options.push(formatTime(minute));
  }
  return options;
}

function LockedPlanner() {
  return (
    <div className="bg-white p-8 md:p-12 rounded-[32px] border border-slate-200 shadow-xl shadow-slate-200/40 text-center">
      <div className="text-5xl mb-5">⚡</div>
      <h2 className="text-3xl font-black mb-3">Planer urządzeń</h2>
      <p className="text-slate-500 max-w-xl mx-auto mb-8 leading-relaxed">
        Planer wyznacza najtańsze interwały pracy dla bojlera, ładowania EV lub innego odbiornika z uwzględnieniem wymaganej energii, mocy i terminu zakończenia.
      </p>
      <form action="/api/checkout_sessions" method="POST">
        <button type="submit" className="px-8 py-4 bg-emerald-500 text-white font-bold rounded-full shadow-lg shadow-emerald-500/30 hover:bg-emerald-600 transition-colors">
          Odblokuj w PRO
        </button>
      </form>
    </div>
  );
}

function PlannerContent({
  todayForecast,
  tomorrowForecast,
  forecastError
}: Omit<TabPlannerProps, 'isPremiumUser'>) {
  const [day, setDay] = useState<'today' | 'tomorrow'>(todayForecast ? 'today' : 'tomorrow');
  const [preset, setPreset] = useState<DevicePreset>('boiler');
  const [energy, setEnergy] = useState(PRESETS.boiler.energy);
  const [power, setPower] = useState(PRESETS.boiler.power);
  const [contiguous, setContiguous] = useState(PRESETS.boiler.contiguous);
  const [earliestStart, setEarliestStart] = useState('00:00');
  const [latestEnd, setLatestEnd] = useState('24:00');
  const [dayAfterTomorrowForecast, setDayAfterTomorrowForecast] = useState<PlannerForecast | null>(null);
  const [futureForecastLoading, setFutureForecastLoading] = useState(false);
  const [futureForecastError, setFutureForecastError] = useState<string | null>(null);
  const requestedFutureForecast = useRef(false);

  const activeForecast = day === 'today' ? todayForecast : tomorrowForecast;
  const overnight = crossesMidnight(earliestStart, latestEnd);
  const nextForecast = day === 'today' ? tomorrowForecast : dayAfterTomorrowForecast;
  const intervalMinutes = activeForecast?.intervalMinutes || 60;
  const earliestOptions = buildTimeOptions(intervalMinutes, false);
  const latestOptions = buildTimeOptions(intervalMinutes, true);

  useEffect(() => {
    if (day !== 'tomorrow' || !overnight || dayAfterTomorrowForecast || requestedFutureForecast.current) return;

    requestedFutureForecast.current = true;
    setFutureForecastLoading(true);
    setFutureForecastError(null);

    fetch('/api/planner/forecast?offset=2', { cache: 'no-store' })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || 'Nie udało się pobrać danych na pojutrze.');
        return payload as PlannerForecast;
      })
      .then(setDayAfterTomorrowForecast)
      .catch((error) => setFutureForecastError(error instanceof Error ? error.message : String(error)))
      .finally(() => setFutureForecastLoading(false));
  }, [day, overnight, dayAfterTomorrowForecast]);

  const missingNextDayData = overnight && !nextForecast;

  const result = useMemo(() => {
    if (!activeForecast || missingNextDayData) return null;

    const intervals = activeForecast.prices.map((item) => ({
      start: item.time,
      pricePerKwh: item.pricePerKwh,
      durationMinutes: activeForecast.intervalMinutes,
      dayOffset: 0,
      date: activeForecast.date
    }));

    if (overnight && nextForecast) {
      intervals.push(...nextForecast.prices.map((item) => ({
        start: item.time,
        pricePerKwh: item.pricePerKwh,
        durationMinutes: nextForecast.intervalMinutes,
        dayOffset: 1,
        date: nextForecast.date
      })));
    }

    return scheduleDevice(intervals, {
      energyRequiredKwh: energy,
      maxPowerKw: power,
      earliestStart,
      latestEnd,
      requireContiguous: contiguous
    });
  }, [activeForecast, contiguous, earliestStart, energy, latestEnd, missingNextDayData, nextForecast, overnight, power]);

  const selectPreset = (value: DevicePreset) => {
    const selected = PRESETS[value];
    setPreset(value);
    setEnergy(selected.energy);
    setPower(selected.power);
    setContiguous(selected.contiguous);
  };

  const dateRange = activeForecast
    ? overnight
      ? `${formatDateLabel(activeForecast.date)} → ${nextForecast ? formatDateLabel(nextForecast.date) : 'następny dzień'}`
      : formatDateLabel(activeForecast.date)
    : '—';

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h2 className="text-3xl font-black">Planer urządzeń</h2>
          <p className="text-slate-500 mt-2 text-sm leading-6 max-w-3xl">
            Podaj energię i ograniczenia urządzenia. Godzina zakończenia wcześniejsza od startu oznacza kolejny dzień, np. 22:00–06:00.
          </p>
        </div>
        <div className="flex bg-slate-200/50 p-1 rounded-xl">
          <button type="button" onClick={() => setDay('today')} disabled={!todayForecast} className={`px-4 py-2 rounded-lg text-sm font-bold ${day === 'today' ? 'bg-white shadow-sm' : 'text-slate-500'} ${!todayForecast ? 'opacity-40 cursor-not-allowed' : ''}`}>
            Dzisiaj
          </button>
          <button type="button" onClick={() => setDay('tomorrow')} disabled={!tomorrowForecast} className={`px-4 py-2 rounded-lg text-sm font-bold ${day === 'tomorrow' ? 'bg-white shadow-sm' : 'text-slate-500'} ${!tomorrowForecast ? 'opacity-40 cursor-not-allowed' : ''}`}>
            Jutro
          </button>
        </div>
      </div>

      {!activeForecast ? (
        <div className="p-8 bg-amber-50 text-amber-800 rounded-2xl border border-amber-200 font-bold">
          {forecastError || 'Brak danych cenowych dla wybranego dnia.'}
        </div>
      ) : (
        <>
          <div className="bg-white p-6 md:p-8 rounded-[32px] border border-slate-200 shadow-xl shadow-slate-200/40">
            <div className="mb-6 flex flex-wrap gap-2">
              {(Object.keys(PRESETS) as DevicePreset[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => selectPreset(key)}
                  className={`px-4 py-2 rounded-full border text-sm font-bold transition-colors ${preset === key ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                >
                  {PRESETS[key].label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <label className="text-sm font-bold text-slate-700">
                Wymagana energia [kWh]
                <input type="number" min="0.1" max="500" step="0.1" value={energy} onChange={(event) => setEnergy(Number(event.target.value))} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal" />
              </label>
              <label className="text-sm font-bold text-slate-700">
                Maksymalna moc [kW]
                <input type="number" min="0.1" max="100" step="0.1" value={power} onChange={(event) => setPower(Number(event.target.value))} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal" />
              </label>
              <label className="text-sm font-bold text-slate-700">
                Tryb pracy
                <select value={contiguous ? 'contiguous' : 'flexible'} onChange={(event) => setContiguous(event.target.value === 'contiguous')} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal bg-white">
                  <option value="contiguous">Praca ciągła</option>
                  <option value="flexible">Można przerywać</option>
                </select>
              </label>
              <label className="text-sm font-bold text-slate-700">
                Najwcześniejszy start
                <select value={earliestStart} onChange={(event) => setEarliestStart(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal bg-white">
                  {earliestOptions.map((time) => <option key={time} value={time}>{time}</option>)}
                </select>
              </label>
              <label className="text-sm font-bold text-slate-700">
                Urządzenie ma skończyć do
                <select value={latestEnd} onChange={(event) => setLatestEnd(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal bg-white">
                  {latestOptions.map((time) => <option key={time} value={time}>{time}</option>)}
                </select>
                {overnight && <span className="mt-1 block text-xs font-normal text-blue-600">Ta godzina przypada następnego dnia.</span>}
              </label>
              <div className="rounded-xl bg-slate-50 border border-slate-200 px-4 py-3">
                <span className="text-sm font-bold text-slate-700 block">Minimalny czas pracy</span>
                <strong className="text-2xl text-slate-900">{power > 0 ? (energy / power).toFixed(2) : '—'} h</strong>
              </div>
            </div>
          </div>

          {futureForecastLoading && missingNextDayData && (
            <div className="p-5 bg-blue-50 text-blue-800 rounded-2xl border border-blue-200 font-semibold">
              Pobieram ceny na kolejny dzień…
            </div>
          )}

          {!futureForecastLoading && missingNextDayData && (
            <div className="p-5 bg-amber-50 text-amber-900 rounded-2xl border border-amber-200 font-semibold">
              {futureForecastError || 'PSE nie opublikowało jeszcze cen na kolejny dzień. Nocny harmonogram będzie dostępny po publikacji danych.'}
            </div>
          )}

          {result?.feasible ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="p-6 bg-white rounded-2xl border border-slate-200">
                  <span className="text-xs uppercase font-bold text-slate-400">Zakres dat</span>
                  <strong className="block mt-2 text-xl">{dateRange}</strong>
                </div>
                <div className="p-6 bg-emerald-50 rounded-2xl border border-emerald-100">
                  <span className="text-xs uppercase font-bold text-emerald-600">Koszt energii RCE</span>
                  <strong className="block mt-2 text-2xl text-emerald-700">{result.totalCost.toFixed(2)} PLN</strong>
                </div>
                <div className="p-6 bg-blue-50 rounded-2xl border border-blue-100">
                  <span className="text-xs uppercase font-bold text-blue-600">Średnia cena</span>
                  <strong className="block mt-2 text-2xl text-blue-700">{result.averagePricePerKwh.toFixed(3)} PLN/kWh</strong>
                </div>
                <div className="p-6 bg-white rounded-2xl border border-slate-200">
                  <span className="text-xs uppercase font-bold text-slate-400">Czas pracy</span>
                  <strong className="block mt-2 text-2xl">{result.runtimeHours.toFixed(2)} h</strong>
                </div>
              </div>

              <div className="bg-white p-6 md:p-8 rounded-[32px] border border-slate-200 shadow-sm">
                <h3 className="text-xl font-black mb-5">Rekomendowany harmonogram</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-left text-slate-400 uppercase text-xs">
                        <th className="py-3 pr-4">Start</th>
                        <th className="py-3 pr-4">Koniec</th>
                        <th className="py-3 pr-4">Energia</th>
                        <th className="py-3 pr-4">Cena RCE</th>
                        <th className="py-3">Koszt</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.slots.map((slot, index) => (
                        <tr key={`${slot.startDate}-${slot.start}-${index}`} className="border-b border-slate-100 last:border-0">
                          <td className="py-4 pr-4 font-bold">{formatDateLabel(slot.startDate)} {slot.start}</td>
                          <td className="py-4 pr-4">{formatDateLabel(slot.endDate)} {slot.end}</td>
                          <td className="py-4 pr-4">{slot.energyKwh.toFixed(3)} kWh</td>
                          <td className="py-4 pr-4">{slot.pricePerKwh.toFixed(4)} PLN/kWh</td>
                          <td className="py-4 font-bold">{slot.cost.toFixed(3)} PLN</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : result ? (
            <div className="p-6 bg-red-50 text-red-800 rounded-2xl border border-red-200 font-semibold">
              {result.reason || 'Nie udało się przygotować harmonogramu.'}
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

export default function TabPlanner(props: TabPlannerProps) {
  if (!props.isPremiumUser) return <LockedPlanner />;
  return (
    <PlannerContent
      todayForecast={props.todayForecast}
      tomorrowForecast={props.tomorrowForecast}
      forecastError={props.forecastError}
    />
  );
}
