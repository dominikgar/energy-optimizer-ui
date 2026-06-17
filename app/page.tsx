// @ts-nocheck
export const dynamic = 'force-dynamic';

import React from 'react';
import { Pool } from 'pg';
import Link from 'next/link';
import { auth } from '@clerk/nextjs/server';
import { UserButton } from '@clerk/nextjs';

import LandingPage from './components/LandingPage';
import TabRadar from './components/TabRadar';
import TabHistory from './components/TabHistory';
import TabAdvisor from './components/TabAdvisor';
import TabApi from './components/TabApi';
import Footer from './components/Footer';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const IconZap = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500 fill-emerald-500">
    <path d="M4 14.71 13.5 3l-1.33 8.29H20l-9.5 11.71 1.33-8.29H4z" />
  </svg>
);

function toMinutes(time) {
  const [hour, minute] = time.split(':').map(Number);
  return hour * 60 + (minute || 0);
}

function extractPseTime(row, itemCount) {
  const explicitDateTime = String(row.dtime || row.udtczas || row.udtczas_oreb || row.data_czas || '');
  const explicitMatch = explicitDateTime.match(/(\d{2}):(\d{2})/);
  if (explicitMatch) return explicitMatch[0];

  const periodValue = row.period ?? row.okres;
  if (periodValue !== undefined && periodValue !== null) {
    const periodText = String(periodValue);
    const periodTimeMatch = periodText.match(/(\d{1,2}):(\d{2})/);
    if (periodTimeMatch) {
      return `${String(Number(periodTimeMatch[1])).padStart(2, '0')}:${periodTimeMatch[2]}`;
    }

    const periodNumber = Number.parseInt(periodText, 10);
    if (Number.isFinite(periodNumber)) {
      if (itemCount > 30) {
        const hour = Math.floor((periodNumber - 1) / 4);
        const minute = ((periodNumber - 1) % 4) * 15;
        return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
      }
      return `${String(Math.max(0, periodNumber - 1)).padStart(2, '0')}:00`;
    }
  }

  if (row.godzina !== undefined) {
    const hour = Number.parseInt(String(row.godzina), 10);
    return `${String(Math.max(0, hour - 1)).padStart(2, '0')}:00`;
  }

  return null;
}

async function fetchPseData(targetDateStr, dateLabel) {
  const params = new URLSearchParams({ '$filter': `business_date eq '${targetDateStr}'` });
  const response = await fetch(`https://api.raporty.pse.pl/api/rce-pln?${params.toString()}`, {
    cache: 'no-store',
    headers: { Accept: 'application/json' }
  });

  if (!response.ok) return null;
  const json = await response.json();
  if (!Array.isArray(json.value) || json.value.length === 0) return null;

  const prices = json.value
    .map((row) => {
      const time = extractPseTime(row, json.value.length);
      const price = Number(row.rce_pln) / 1000;
      if (!time || !Number.isFinite(price)) return null;
      return { time, price };
    })
    .filter(Boolean)
    .sort((a, b) => toMinutes(a.time) - toMinutes(b.time));

  if (prices.length === 0) return null;

  const isQuarterHourly = prices.length > 30;
  const elementsInThreeHours = isQuarterHourly ? 12 : 3;
  if (prices.length < elementsInThreeHours) return null;

  let bestWindowStart = '';
  let bestWindowEnd = '';
  let bestWindowAvgPrice = Number.POSITIVE_INFINITY;
  let worstWindowStart = '';
  let worstWindowEnd = '';
  let worstWindowAvgPrice = Number.NEGATIVE_INFINITY;

  for (let i = 0; i <= prices.length - elementsInThreeHours; i++) {
    const windowItems = prices.slice(i, i + elementsInThreeHours);
    const average = windowItems.reduce((sum, item) => sum + item.price, 0) / elementsInThreeHours;
    const lastItem = windowItems[windowItems.length - 1];
    let endMinutes = toMinutes(lastItem.time) + (isQuarterHourly ? 15 : 60);
    endMinutes %= 1440;
    const endHour = Math.floor(endMinutes / 60);
    const endMinute = endMinutes % 60;
    const endTime = `${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}`;

    if (average < bestWindowAvgPrice) {
      bestWindowAvgPrice = average;
      bestWindowStart = windowItems[0].time;
      bestWindowEnd = endTime;
    }

    if (average > worstWindowAvgPrice) {
      worstWindowAvgPrice = average;
      worstWindowStart = windowItems[0].time;
      worstWindowEnd = endTime;
    }
  }

  return {
    prices,
    date: targetDateStr,
    dateLabel,
    absoluteMinPrice: Math.min(...prices.map((item) => item.price)),
    absoluteMaxPrice: Math.max(...prices.map((item) => item.price)),
    bestWindowStart,
    bestWindowEnd,
    bestWindowAvgPrice,
    worstWindowStart,
    worstWindowEnd,
    worstWindowAvgPrice
  };
}

export default async function Home({ searchParams }) {
  const { userId } = auth();
  const resolvedParams = await Promise.resolve(searchParams || {});
  const activeTab = resolvedParams.tab || 'radar';
  const parsedDays = Number.parseInt(resolvedParams.days, 10);
  const days = [3, 7, 30].includes(parsedDays) ? parsedDays : 3;
  const selectedProvider = resolvedParams.provider || 'G11_TAURON';

  const globalStyles = `
    @keyframes fade-in-up {
      0% { opacity: 0; transform: translateY(20px); }
      100% { opacity: 1; transform: translateY(0); }
    }
    .animate-fade-in-up { animation: fade-in-up 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
    .glass-panel { background: rgba(255, 255, 255, 0.7); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); border: 1px solid rgba(255, 255, 255, 0.5); }
    .text-gradient { background-clip: text; -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
  `;

  if (!userId) {
    return (
      <>
        <style dangerouslySetInnerHTML={{ __html: globalStyles }} />
        <LandingPage />
      </>
    );
  }

  let isPremiumUser = false;
  let userApiKey = null;
  let availableTariffs = [];
  let currentTariff = { price_per_kwh: 1.10, tariff_name: 'G11_TAURON' };

  try {
    const [subscriptionResult, tariffResult] = await Promise.all([
      pool.query('SELECT is_active, api_key FROM user_subscriptions WHERE user_id = $1', [userId]),
      pool.query('SELECT tariff_name, price_per_kwh, description FROM energy_tariffs ORDER BY tariff_name ASC')
    ]);

    if (subscriptionResult.rows[0]?.is_active) {
      isPremiumUser = true;
      userApiKey = subscriptionResult.rows[0].api_key;
    }

    availableTariffs = tariffResult.rows;
    const selectedTariff = availableTariffs.find((tariff) => tariff.tariff_name === selectedProvider);
    if (selectedTariff) currentTariff = selectedTariff;
  } catch (error) {
    console.error('Database Error:', error);
  }

  const displayProviders = availableTariffs.filter((tariff) => tariff.tariff_name !== 'G11' && tariff.tariff_name.startsWith('G11'));
  let chartData = [];
  const stats = { totalKwh: 0, costRCE: 0, costG11: 0, worstHour: 0, worstHourCost: 0, bestHour: 0, bestHourPrice: 999 };
  const dataRange = { min: null, max: null };

  if (activeTab === 'history' || activeTab === 'advisor') {
    try {
      const rangeResult = await pool.query(
        'SELECT MIN(timestamp) AS min_ts, MAX(timestamp) AS max_ts FROM energy_consumption WHERE user_id = $1',
        [userId]
      );

      if (rangeResult.rows[0]?.min_ts) {
        dataRange.min = new Date(rangeResult.rows[0].min_ts).toLocaleDateString('pl-PL');
        dataRange.max = new Date(rangeResult.rows[0].max_ts).toLocaleDateString('pl-PL');
      }

      const { rows } = await pool.query(`
        WITH hourly_prices AS (
          SELECT DATE_TRUNC('hour', timestamp) AS hour_ts, AVG(price_pln_mwh) AS price_mwh
          FROM energy_prices
          GROUP BY DATE_TRUNC('hour', timestamp)
        )
        SELECT c.timestamp, c.value_kwh, p.price_mwh
        FROM energy_consumption c
        JOIN hourly_prices p ON DATE_TRUNC('hour', c.timestamp) = p.hour_ts
        WHERE c.user_id = $1
          AND (c.type ILIKE '%pobór%' OR c.type ILIKE '%pobor%')
        ORDER BY c.timestamp DESC
        LIMIT $2
      `, [userId, days * 24]);

      const g11Rate = Number.parseFloat(currentTariff.price_per_kwh);
      const hourlyAggregation = Array.from({ length: 24 }, () => ({ cost: 0, priceSum: 0, count: 0 }));

      chartData = rows.reverse().map((row) => {
        const kwh = Number.parseFloat(row.value_kwh);
        const priceRCE = Number.parseFloat(row.price_mwh) / 1000;
        const timestamp = new Date(row.timestamp);
        const hour = timestamp.getHours();

        stats.totalKwh += kwh;
        stats.costRCE += kwh * priceRCE;
        stats.costG11 += kwh * g11Rate;
        hourlyAggregation[hour].cost += kwh * priceRCE;
        hourlyAggregation[hour].priceSum += priceRCE;
        hourlyAggregation[hour].count++;

        return {
          time: timestamp.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' }),
          kwh,
          price: priceRCE,
          g11Price: g11Rate
        };
      });

      hourlyAggregation.forEach((item, hour) => {
        if (item.count === 0) return;
        if (item.cost > stats.worstHourCost) {
          stats.worstHourCost = item.cost;
          stats.worstHour = hour;
        }
        const averagePrice = item.priceSum / item.count;
        if (averagePrice < stats.bestHourPrice) {
          stats.bestHourPrice = averagePrice;
          stats.bestHour = hour;
        }
      });
    } catch (error) {
      console.error('History query error:', error);
    }
  }

  let todayForecast = null;
  let tomorrowForecast = null;
  let forecastError = null;

  // Dane PRO pobieramy wyłącznie po serwerowym potwierdzeniu aktywnej subskrypcji.
  if (activeTab === 'radar' && isPremiumUser) {
    try {
      const polandTime = new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Warsaw' }));
      const formatDate = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      const todayString = formatDate(polandTime);
      const tomorrow = new Date(polandTime);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowString = formatDate(tomorrow);

      [todayForecast, tomorrowForecast] = await Promise.all([
        fetchPseData(todayString, 'Dzisiaj'),
        fetchPseData(tomorrowString, 'Jutro')
      ]);

      if (!todayForecast && !tomorrowForecast) {
        forecastError = 'PSE nie opublikowało jeszcze danych na dziś ani na jutro.';
      }
    } catch (error) {
      console.error('PSE fetch error:', error);
      forecastError = 'Błąd połączenia z PSE.';
    }
  }

  return (
    <div className="min-h-screen w-full bg-slate-50 font-sans text-slate-900 pb-20">
      <style dangerouslySetInnerHTML={{ __html: globalStyles }} />

      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 h-16 flex justify-between items-center">
          <div className="flex items-center gap-2 font-black text-xl tracking-tight">
            <IconZap />
            <span className="bg-gradient-to-r from-emerald-600 to-blue-600 bg-clip-text text-transparent">EnergyOptimizer</span>
          </div>
          <div className="flex items-center gap-4 bg-slate-50 border border-slate-200 px-2 py-1.5 rounded-full">
            {isPremiumUser && (
              <a href="/api/customer_portal" className="text-xs font-bold text-emerald-600 bg-emerald-100 px-3 py-1 rounded-full hover:bg-emerald-200 transition-colors">
                PRO ACTIVE ⚙️
              </a>
            )}
            <UserButton afterSignOutUrl="/" />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 pt-10">
        <nav className="grid grid-cols-2 md:flex md:flex-row gap-2 p-1.5 bg-slate-200/50 backdrop-blur-sm rounded-2xl border border-slate-200 mb-10">
          {[
            { id: 'radar', label: 'Radar na dziś 🟢', short: 'Radar 🟢' },
            { id: 'history', label: 'Profil Historyczny', short: 'Historia' },
            { id: 'advisor', label: 'Doradca Taryfowy', short: 'Doradca' },
            { id: 'api', label: 'API Automatyzacji 🔌', short: 'API 🔌' }
          ].map((tab) => (
            <Link
              key={tab.id}
              href={`/?tab=${tab.id}&days=${days}&provider=${selectedProvider}`}
              className={`flex items-center justify-center px-2 py-3 md:px-6 md:py-3 rounded-xl font-bold text-xs sm:text-sm transition-all ${activeTab === tab.id ? 'bg-white text-blue-600 shadow-sm border border-slate-200/50' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200'}`}
            >
              <span className="hidden md:inline">{tab.label}</span>
              <span className="md:hidden">{tab.short}</span>
            </Link>
          ))}
        </nav>

        <div className="animate-fade-in-up">
          {activeTab === 'radar' && (
            <TabRadar isPremiumUser={isPremiumUser} todayForecast={todayForecast} tomorrowForecast={tomorrowForecast} forecastError={forecastError} />
          )}
          {activeTab === 'history' && <TabHistory days={days} chartData={chartData} dataRange={dataRange} />}
          {activeTab === 'advisor' && (
            <TabAdvisor days={days} selectedProvider={selectedProvider} displayProviders={displayProviders} chartData={chartData} stats={stats} />
          )}
          {activeTab === 'api' && <TabApi userApiKey={userApiKey} />}
        </div>
      </main>

      <Footer />
    </div>
  );
}
