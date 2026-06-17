// @ts-nocheck
export const dynamic = 'force-dynamic';

import React from 'react';
import Link from 'next/link';
import { auth } from '@clerk/nextjs/server';
import { UserButton } from '@clerk/nextjs';
import TabHeatPumpComfort from '../components/TabHeatPumpComfort';
import Footer from '../components/Footer';
import { pool } from '../../lib/db';
import { fetchPseDayForecast } from '../../lib/pse';
import { hasProAccess, hasStalePeriodMetadata } from '../../lib/proAccess';

function formatDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function toPlannerForecast(forecast: any, label: string) {
  if (!forecast) return null;
  return {
    date: forecast.date,
    label,
    intervalMinutes: forecast.intervalMinutes,
    prices: forecast.prices
  };
}

export default async function ComfortPage() {
  const { userId } = auth();

  if (!userId) {
    return (
      <main className="min-h-screen bg-slate-50 px-6 py-16">
        <div className="mx-auto max-w-xl rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="text-5xl mb-5">🌡️</div>
          <h1 className="text-3xl font-black">Komfort cieplny</h1>
          <p className="mt-4 text-slate-600 leading-7">Zaloguj się, aby uruchomić model pompy ciepła i bezwładności budynku.</p>
          <Link href="/sign-in" className="mt-7 inline-block rounded-full bg-emerald-500 px-7 py-3 font-bold text-white hover:bg-emerald-600">Zaloguj się</Link>
        </div>
      </main>
    );
  }

  let isPremiumUser = false;
  try {
    const { rows } = await pool.query(
      `SELECT is_active, current_period_end
       FROM user_subscriptions
       WHERE user_id = $1
       LIMIT 1`,
      [userId]
    );
    const subscription = rows[0];
    isPremiumUser = hasProAccess(subscription);
    if (hasStalePeriodMetadata(subscription)) {
      console.warn('PRO subscription has stale current_period_end metadata', { userId, area: 'comfort' });
    }
  } catch (error) {
    console.error('Comfort subscription error:', error);
  }

  let todayForecast = null;
  let tomorrowForecast = null;
  let forecastError = null;

  if (isPremiumUser) {
    try {
      const polishNow = new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Warsaw' }));
      const today = formatDate(polishNow);
      const tomorrowDate = new Date(polishNow);
      tomorrowDate.setDate(tomorrowDate.getDate() + 1);
      const tomorrow = formatDate(tomorrowDate);

      const [todayData, tomorrowData] = await Promise.all([
        fetchPseDayForecast(today),
        fetchPseDayForecast(tomorrow)
      ]);
      todayForecast = toPlannerForecast(todayData, 'Dzisiaj');
      tomorrowForecast = toPlannerForecast(tomorrowData, 'Jutro');
      if (!todayData && !tomorrowData) forecastError = 'PSE nie opublikowało jeszcze danych na dziś ani na jutro.';
    } catch (error) {
      console.error('Comfort PSE error:', error);
      forecastError = 'Błąd połączenia z PSE.';
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link href="/?tab=planner" className="font-black text-slate-700 hover:text-emerald-600">← Wróć do EnergyOptimizer</Link>
          <div className="flex items-center gap-3">
            {isPremiumUser && <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">PRO ACTIVE</span>}
            <UserButton afterSignOutUrl="/" />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-10">
        <TabHeatPumpComfort
          isPremiumUser={isPremiumUser}
          todayForecast={todayForecast}
          tomorrowForecast={tomorrowForecast}
          forecastError={forecastError}
        />
      </main>
      <Footer />
    </div>
  );
}
