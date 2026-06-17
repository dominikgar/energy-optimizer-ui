'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import HeatPumpComfortPanel from './HeatPumpComfortPanel';
import { DevicePriceInterval } from '../../lib/deviceScheduler';

interface PlannerForecast {
  date: string;
  label: string;
  intervalMinutes: number;
  prices: { time: string; pricePerKwh: number }[];
}

interface TabHeatPumpComfortProps {
  isPremiumUser: boolean;
  todayForecast: PlannerForecast | null;
  tomorrowForecast: PlannerForecast | null;
  forecastError: string | null;
}

function formatTime(minutes: number): string {
  if (minutes >= 1440) return '24:00';
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}

function timeToMinutes(time: string): number {
  if (time === '24:00') return 1440;
  const [hour, minute] = time.split(':').map(Number);
  return hour * 60 + minute;
}

function crossesMidnight(start: string, end: string): boolean {
  return end !== '24:00' && timeToMinutes(end) <= timeToMinutes(start);
}

function buildTimeOptions(intervalMinutes: number, includeEnd: boolean): string[] {
  const options: string[] = [];
  const end = includeEnd ? 1440 : 1440 - intervalMinutes;
  for (let minute = 0; minute <= end; minute += intervalMinutes) {
    options.push(formatTime(minute));
  }
  return options;
}

function formatDateLabel(date: string | null): string {
  if (!date) return '';
  const [year, month, day] = date.split('-');
  return `${day}.${month}.${year}`;
}

function LockedHeatPumpComfort() {
  return (
    <div className="bg-white p-8 md:p-12 rounded-[32px] border border-slate-200 shadow-xl shadow-slate-200/40 text-center">
      <div className="text-5xl mb-5">🌡️</div>
      <h2 className="text-3xl font-black mb-3">Komfort cieplny</h2>
      <p className="text-slate-500 max-w-xl mx-auto mb-8 leading-relaxed">
        Zaawansowany model pompy ciepła pilnuje temperatury minimalnej i wykorzystuje bezwładność budynku do przesuwania grzania na tańsze godziny.
      </p>
      <form action="/api/checkout_sessions" method="POST">
        <button type="submit" className="px-8 py-4 bg-emerald-500 text-white font-bold rounded-full shadow-lg shadow-emerald-500/30 hover:bg-emerald-600 transition-colors">
          Odblokuj w PRO
        </button>
      </form>
    </div>
  );
}

export default function TabHeatPumpComfort({
  isPremiumUser,
  todayForecast,
  tomorrowForecast,
  forecastError
}: TabHeatPumpComfortProps) {
  const [day, setDay] = useState<'today' | 'tomorrow'>(todayForecast ? 'today' : 'tomorrow');
  const [earliestStart, setEarliestStart] = useState('00:00');
  const [latestEnd, setLatestEnd] = useState('24:00');
  const [dayAfterTomorrowForecast, setDayAfterTomorrowForecast] = useState<PlannerForecast | null>(null);
  const [futureLoading, setFutureLoading] = useState(false);
  const [futureError, setFutureError] = useState<string | null>(null);
  const futureRequested = useRef(false);

  if (!isPremiumUser) return <LockedHeatPumpComfort />;

  const activeForecast = day === 'today' ? todayForecast : tomorrowForecast;
  const overnight = crossesMidnight(earliestStart, latestEnd);
  const nextForecast = day === 'today' ? tomorrowForecast : dayAfterTomorrowForecast;
  const intervalMinutes = activeForecast?.intervalMinutes || 60;
  const earliestOptions = buildTimeOptions(intervalMinutes, false);
  const latestOptions = buildTimeOptions(intervalMinutes, true);

  useEffect(() => {
    if (day !== 'tomorrow' || !overnight || dayAfterTomorrowForecast || futureRequested.current) return;

    futureRequested.current = true;
    setFutureLoading(true);
    setFutureError(null);
    fetch('/api/planner/forecast?offset=2', { cache: 'no-store' })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || 'Nie udało się pobrać danych na pojutrze.');
        return payload as PlannerForecast;
      })
      .then(setDayAfterTomorrowForecast)
      .catch((error) => setFutureError(error instanceof Error ? error.message : String(error)))
      .finally(() => setFutureLoading(false));
  }, [day, overnight, dayAfterTomorrowForecast]);

  const intervals = useMemo<DevicePriceInterval[]>(() => {
    if (!activeForecast) return [];
    const result = activeForecast.prices.map((item) => ({
      start: item.time,
      pricePerKwh: item.pricePerKwh,
      durationMinutes: activeForecast.intervalMinutes,
      dayOffset: 0,
      date: activeForecast.date
    }));

    if (overnight && nextForecast) {
      result.push(...nextForecast.prices.map((item) => ({
        start: item.time,
        pricePerKwh: item.pricePerKwh,
        durationMinutes: nextForecast.intervalMinutes,
        dayOffset: 1,
        date: nextForecast.date
      })));
    }
    return result;
  }, [activeForecast, nextForecast, overnight]);

  const missingNextDay = overnight && !nextForecast;

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-orange-600 mb-2">Pompa ciepła</p>
          <h2 className="text-3xl font-black">Komfort i bezwładność budynku</h2>
          <p className="text-slate-500 mt-2 text-sm leading-6 max-w-3xl">
            Model szuka najtańszego sterowania, które utrzymuje temperaturę komfortu. Budynek może zostać wcześniej podgrzany i oddawać ciepło w droższych godzinach.
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
      ) : missingNextDay ? (
        <div className="p-6 bg-amber-50 text-amber-900 rounded-2xl border border-amber-200 font-semibold">
          {futureLoading
            ? 'Pobieram ceny na kolejny dzień…'
            : futureError || 'PSE nie opublikowało jeszcze cen na kolejny dzień. Model nocny będzie dostępny po publikacji danych.'}
        </div>
      ) : (
        <HeatPumpComfortPanel
          intervals={intervals}
          earliestStart={earliestStart}
          latestEnd={latestEnd}
          earliestOptions={earliestOptions}
          latestOptions={latestOptions}
          onEarliestStartChange={setEarliestStart}
          onLatestEndChange={setLatestEnd}
          overnight={overnight}
          formatDateLabel={formatDateLabel}
        />
      )}
    </div>
  );
}
