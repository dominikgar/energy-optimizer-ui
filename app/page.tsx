// @ts-nocheck
export const dynamic = 'force-dynamic';

import React from 'react';
import { Pool } from 'pg';
import Link from 'next/link';
import { auth } from '@clerk/nextjs/server';
import { UserButton } from '@clerk/nextjs';

import LandingPage from './components/LandingPage';
import TabRadar from './components/TabRadar';
import TabPlanner from './components/TabPlanner';
import TabHeatPumpComfort from './components/TabHeatPumpComfort';
import TabBatteryArbitrage from './components/TabBatteryArbitrage';
import TabHistory from './components/TabHistory';
import TabAdvisor from './components/TabAdvisor';
import TabApi from './components/TabApi';
import Footer from './components/Footer';
import { calculateDynamicOfferCost, calculateFixedRateCost } from '../lib/costEngine';
import { calculateDistributionCost } from '../lib/distributionCost';
import { fetchPseDayForecast } from '../lib/pse';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const IconZap = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500 fill-emerald-500">
    <path d="M4 14.71 13.5 3l-1.33 8.29H20l-9.5 11.71 1.33-8.29H4z" />
  </svg>
);

function parseNumberParam(value, fallback, min, max) {
  const normalized = String(value ?? '').replace(',', '.');
  const parsed = Number.parseFloat(normalized);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function formatDate(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function toRadarForecast(forecast, dateLabel) {
  if (!forecast) return null;
  return {
    date: forecast.date,
    dateLabel,
    prices: forecast.prices.map((item) => ({ time: item.time, price: item.pricePerKwh })),
    absoluteMinPrice: forecast.minimumPrice,
    absoluteMaxPrice: forecast.maximumPrice,
    bestWindowStart: forecast.bestWindowStart,
    bestWindowEnd: forecast.bestWindowEnd,
    bestWindowAvgPrice: forecast.bestWindowAveragePrice,
    worstWindowStart: forecast.worstWindowStart,
    worstWindowEnd: forecast.worstWindowEnd,
    worstWindowAvgPrice: forecast.worstWindowAveragePrice
  };
}

function toPlannerForecast(forecast, label) {
  if (!forecast) return null;
  return {
    date: forecast.date,
    label,
    intervalMinutes: forecast.intervalMinutes,
    prices: forecast.prices
  };
}

export default async function Home({ searchParams }) {
  const { userId } = auth();
  const params = await Promise.resolve(searchParams || {});
  const activeTab = params.tab || 'radar';
  const parsedDays = Number.parseInt(params.days, 10);
  const days = [3, 7, 30].includes(parsedDays) ? parsedDays : 3;
  const selectedProvider = params.provider || 'G11_TAURON';

  const dynamicOfferConfig = {
    marketMultiplier: parseNumberParam(params.multiplier, 1, 0, 10),
    marginPerKwh: parseNumberParam(params.margin, 0, -5, 5),
    variableFeePerKwh: parseNumberParam(params.variableFee, 0, -5, 5),
    monthlyFee: parseNumberParam(params.monthlyFee, 0, 0, 1000),
    vatPercent: parseNumberParam(params.vat, 0, 0, 100),
    floorNegativeMarketPricesAtZero: params.negativePrices === 'floor'
  };

  const distributionConfig = {
    variableRatePerKwh: parseNumberParam(params.distributionVariable, 0, 0, 20),
    additionalVariableRatePerKwh: parseNumberParam(params.distributionAdditional, 0, 0, 20),
    monthlyFixedFee: parseNumberParam(params.distributionMonthly, 0, 0, 2000),
    monthlyCapacityFee: parseNumberParam(params.capacityMonthly, 0, 0, 2000),
    vatPercent: parseNumberParam(params.distributionVat, 0, 0, 100)
  };

  const globalStyles = `
    @keyframes fade-in-up {
      0% { opacity: 0; transform: translateY(20px); }
      100% { opacity: 1; transform: translateY(0); }
    }
    .animate-fade-in-up { animation: fade-in-up 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
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

  const displayProviders = availableTariffs.filter(
    (tariff) => tariff.tariff_name !== 'G11' && tariff.tariff_name.startsWith('G11')
  );

  let chartData = [];
  const stats = {
    totalKwh: 0,
    costRCE: 0,
    costG11: 0,
    costDynamic: 0,
    billG11: 0,
    billDynamic: 0,
    difference: 0,
    dynamicBreakdown: null,
    distributionBreakdown: null,
    worstHour: 0,
    worstHourCost: 0,
    bestHour: 0,
    bestHourPrice: 999
  };
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
        WITH bounds AS (
          SELECT MAX(timestamp) AS max_ts
          FROM energy_consumption
          WHERE user_id = $1
        ),
        hourly_prices AS (
          SELECT DATE_TRUNC('hour', timestamp) AS hour_ts, AVG(price_pln_mwh) AS price_mwh
          FROM energy_prices
          GROUP BY DATE_TRUNC('hour', timestamp)
        )
        SELECT c.timestamp, c.value_kwh, p.price_mwh
        FROM energy_consumption c
        JOIN hourly_prices p ON DATE_TRUNC('hour', c.timestamp) = p.hour_ts
        CROSS JOIN bounds b
        WHERE c.user_id = $1
          AND (c.type ILIKE '%pobór%' OR c.type ILIKE '%pobor%')
          AND c.timestamp > b.max_ts - make_interval(days => $2::int)
          AND c.timestamp <= b.max_ts
        ORDER BY c.timestamp ASC
      `, [userId, days]);

      const g11Rate = Number.parseFloat(currentTariff.price_per_kwh);
      const hourlyAggregation = Array.from({ length: 24 }, () => ({ cost: 0, priceSum: 0, count: 0 }));
      const costPoints = [];

      chartData = rows.map((row) => {
        const kwh = Number.parseFloat(row.value_kwh);
        const priceRCE = Number.parseFloat(row.price_mwh) / 1000;
        const timestamp = new Date(row.timestamp);
        const hour = timestamp.getHours();

        costPoints.push({ kwh, marketPricePerKwh: priceRCE });
        stats.totalKwh += kwh;
        stats.costRCE += kwh * priceRCE;
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

      const firstTimestamp = rows[0]?.timestamp ? new Date(rows[0].timestamp) : null;
      const lastTimestamp = rows.at(-1)?.timestamp ? new Date(rows.at(-1).timestamp) : null;
      const actualPeriodDays = firstTimestamp && lastTimestamp
        ? Math.max(1 / 24, (lastTimestamp.getTime() - firstTimestamp.getTime() + 60 * 60 * 1000) / (24 * 60 * 60 * 1000))
        : 0;

      stats.costG11 = calculateFixedRateCost(costPoints, g11Rate);
      stats.dynamicBreakdown = calculateDynamicOfferCost(costPoints, dynamicOfferConfig, actualPeriodDays);
      stats.costDynamic = stats.dynamicBreakdown.totalCost;
      stats.distributionBreakdown = calculateDistributionCost(stats.totalKwh, distributionConfig, actualPeriodDays);
      stats.billG11 = stats.costG11 + stats.distributionBreakdown.totalCost;
      stats.billDynamic = stats.costDynamic + stats.distributionBreakdown.totalCost;
      stats.difference = stats.billG11 - stats.billDynamic;

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
  let todayPlannerForecast = null;
  let tomorrowPlannerForecast = null;
  let forecastError = null;

  if (['radar', 'planner', 'comfort', 'battery'].includes(activeTab) && isPremiumUser) {
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

      todayForecast = toRadarForecast(todayData, 'Dzisiaj');
      tomorrowForecast = toRadarForecast(tomorrowData, 'Jutro');
      todayPlannerForecast = toPlannerForecast(todayData, 'Dzisiaj');
      tomorrowPlannerForecast = toPlannerForecast(tomorrowData, 'Jutro');

      if (!todayData && !tomorrowData) {
        forecastError = 'PSE nie opublikowało jeszcze danych na dziś ani na jutro.';
      }
    } catch (error) {
      console.error('PSE fetch error:', error);
      forecastError = 'Błąd połączenia z PSE.';
    }
  }

  const advisorQuery = new URLSearchParams({
    multiplier: String(dynamicOfferConfig.marketMultiplier),
    margin: String(dynamicOfferConfig.marginPerKwh),
    variableFee: String(dynamicOfferConfig.variableFeePerKwh),
    monthlyFee: String(dynamicOfferConfig.monthlyFee),
    vat: String(dynamicOfferConfig.vatPercent),
    negativePrices: dynamicOfferConfig.floorNegativeMarketPricesAtZero ? 'floor' : 'pass',
    distributionVariable: String(distributionConfig.variableRatePerKwh),
    distributionAdditional: String(distributionConfig.additionalVariableRatePerKwh),
    distributionMonthly: String(distributionConfig.monthlyFixedFee),
    capacityMonthly: String(distributionConfig.monthlyCapacityFee),
    distributionVat: String(distributionConfig.vatPercent)
  }).toString();

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
        <nav className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-7 gap-2 p-1.5 bg-slate-200/50 rounded-2xl border border-slate-200 mb-10">
          {[
            { id: 'radar', label: 'Radar cenowy 🟢', short: 'Radar 🟢' },
            { id: 'planner', label: 'Planer urządzeń ⚡', short: 'Planer ⚡' },
            { id: 'comfort', label: 'Komfort cieplny 🌡️', short: 'Ciepło 🌡️' },
            { id: 'battery', label: 'Magazyn i PV 🔋', short: 'Magazyn 🔋' },
            { id: 'history', label: 'Profil historyczny', short: 'Historia' },
            { id: 'advisor', label: 'Doradca taryfowy', short: 'Doradca' },
            { id: 'api', label: 'API automatyzacji 🔌', short: 'API 🔌' }
          ].map((tab) => (
            <Link
              key={tab.id}
              href={`/?tab=${tab.id}&days=${days}&provider=${selectedProvider}${tab.id === 'advisor' ? `&${advisorQuery}` : ''}`}
              className={`flex items-center justify-center px-2 py-3 rounded-xl font-bold text-xs sm:text-sm text-center transition-all ${activeTab === tab.id ? 'bg-white text-blue-600 shadow-sm border border-slate-200/50' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200'}`}
            >
              <span className="hidden lg:inline">{tab.label}</span>
              <span className="lg:hidden">{tab.short}</span>
            </Link>
          ))}
        </nav>

        <div className="animate-fade-in-up">
          {activeTab === 'radar' && (
            <TabRadar isPremiumUser={isPremiumUser} todayForecast={todayForecast} tomorrowForecast={tomorrowForecast} forecastError={forecastError} />
          )}
          {activeTab === 'planner' && (
            <TabPlanner
              isPremiumUser={isPremiumUser}
              todayForecast={todayPlannerForecast}
              tomorrowForecast={tomorrowPlannerForecast}
              forecastError={forecastError}
            />
          )}
          {activeTab === 'comfort' && (
            <TabHeatPumpComfort
              isPremiumUser={isPremiumUser}
              todayForecast={todayPlannerForecast}
              tomorrowForecast={tomorrowPlannerForecast}
              forecastError={forecastError}
            />
          )}
          {activeTab === 'battery' && (
            <TabBatteryArbitrage
              isPremiumUser={isPremiumUser}
              todayForecast={todayPlannerForecast}
              tomorrowForecast={tomorrowPlannerForecast}
              forecastError={forecastError}
            />
          )}
          {activeTab === 'history' && <TabHistory days={days} chartData={chartData} dataRange={dataRange} />}
          {activeTab === 'advisor' && (
            <TabAdvisor
              days={days}
              selectedProvider={selectedProvider}
              displayProviders={displayProviders}
              chartData={chartData}
              stats={stats}
              dynamicOfferConfig={dynamicOfferConfig}
              distributionConfig={distributionConfig}
            />
          )}
          {activeTab === 'api' && <TabApi userApiKey={userApiKey} />}
        </div>
      </main>

      <Footer />
    </div>
  );
}
