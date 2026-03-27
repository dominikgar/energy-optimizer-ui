// @ts-nocheck
export const dynamic = "force-dynamic";

import React from 'react';
import { Pool } from 'pg';
import Link from 'next/link';
import { auth } from '@clerk/nextjs/server';
import { UserButton } from '@clerk/nextjs';

// --- IMPORTY NASZYCH WYDZIELONYCH KOMPONENTÓW ---
import LandingPage from './components/LandingPage';
import TabRadar from './components/TabRadar';
import TabHistory from './components/TabHistory';
import TabAdvisor from './components/TabAdvisor';
import TabApi from './components/TabApi';

// --- KONFIGURACJA BAZY DANYCH ---
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const IconZap = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500 fill-emerald-500"><path d="M4 14.71 13.5 3l-1.33 8.29H20l-9.5 11.71 1.33-8.29H4z"/></svg>
);

// --- GŁÓWNA LOGIKA SERWEROWA ---
export default async function Home({ searchParams }) {
  const { userId } = auth();
  const resolvedParams = await Promise.resolve(searchParams || {});
  
  const activeTab = resolvedParams.tab || 'radar';
  const days = parseInt(resolvedParams.days) || 3;
  const selectedProvider = resolvedParams.provider || 'G11_TAURON';

  // Globalne style i animacje
  const globalStyles = `
    @keyframes fade-in-up {
      0% { opacity: 0; transform: translateY(20px); }
      100% { opacity: 1; transform: translateY(0); }
    }
    .animate-fade-in-up { animation: fade-in-up 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
    .glass-panel { background: rgba(255, 255, 255, 0.7); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); border: 1px solid rgba(255, 255, 255, 0.5); }
    .text-gradient { background-clip: text; -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
  `;

  // ============================================================================
  // WIDOK 1: LANDING PAGE (DLA NIEZALOGOWANYCH GOŚCI)
  // ============================================================================
  if (!userId) {
    return (
      <>
        <style dangerouslySetInnerHTML={{__html: globalStyles}} />
        <LandingPage />
      </>
    );
  }

  // ============================================================================
  // WIDOK 2: POBIERANIE DANYCH BIZNESOWYCH DLA ZALOGOWANYCH
  // ============================================================================
  
  // 1. Sprawdzanie subskrypcji i dostępnych taryf
  let isPremiumUser = false;
  let userApiKey = null;
  let availableTariffs = [];
  let currentTariff = { price_per_kwh: 1.10, tariff_name: 'G11_TAURON' };

  try {
    const sub = await pool.query('SELECT is_active, api_key FROM user_subscriptions WHERE user_id = $1', [userId]);
    if (sub.rows.length > 0 && sub.rows[0].is_active) {
      isPremiumUser = true;
      userApiKey = sub.rows[0].api_key;
    }
    const tariffs = await pool.query('SELECT tariff_name, price_per_kwh, description FROM energy_tariffs ORDER BY tariff_name ASC');
    availableTariffs = tariffs.rows;
    const found = availableTariffs.find(t => t.tariff_name === selectedProvider);
    if (found) currentTariff = found;
  } catch (e) {
    console.error("Database Error:", e);
  }

  const displayProviders = availableTariffs.filter(t => t.tariff_name !== 'G11' && t.tariff_name.startsWith('G11'));

  // 2. Pobieranie Historii Zużycia i Przeliczanie dla Doradcy
  let chartData = [];
  let stats = { totalKwh: 0, costRCE: 0, costG11: 0, worstHour: 0, worstHourCost: 0, bestHour: 0, bestHourPrice: 999 };
  let dataRange = { min: null, max: null };

  if (activeTab === 'history' || activeTab === 'advisor') {
    try {
      const rangeRes = await pool.query('SELECT MIN(timestamp) as min_ts, MAX(timestamp) as max_ts FROM energy_consumption WHERE user_id = $1', [userId]);
      if (rangeRes.rows.length > 0 && rangeRes.rows[0].min_ts) {
        dataRange.min = new Date(rangeRes.rows[0].min_ts).toLocaleDateString('pl-PL');
        dataRange.max = new Date(rangeRes.rows[0].max_ts).toLocaleDateString('pl-PL');
      }

      const { rows } = await pool.query(`
        WITH hourly_prices AS (
            SELECT DATE_TRUNC('hour', timestamp) AS hour_ts, AVG(price_pln_mwh) AS price_mwh
            FROM energy_prices GROUP BY DATE_TRUNC('hour', timestamp)
        )
        SELECT c.timestamp, c.value_kwh, p.price_mwh
        FROM energy_consumption c
        JOIN hourly_prices p ON DATE_TRUNC('hour', c.timestamp) = p.hour_ts
        WHERE c.user_id = $1 AND (c.type ILIKE '%pobór%' OR c.type ILIKE '%pobor%')
        ORDER BY c.timestamp DESC LIMIT $2
      `, [userId, days * 24]);

      const g11Rate = parseFloat(currentTariff.price_per_kwh);
      const hourlyAggregation = Array(24).fill(null).map(() => ({ cost: 0, priceSum: 0, count: 0 }));

      chartData = rows.reverse().map(row => {
        const kwh = parseFloat(row.value_kwh);
        const priceRCE = parseFloat(row.price_mwh) / 1000;
        const ts = new Date(row.timestamp);
        const hr = ts.getHours();
        
        stats.totalKwh += kwh;
        stats.costRCE += (kwh * priceRCE);
        stats.costG11 += (kwh * g11Rate);
        hourlyAggregation[hr].cost += (kwh * priceRCE);
        hourlyAggregation[hr].priceSum += priceRCE;
        hourlyAggregation[hr].count++;

        return { time: ts.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' }), kwh, price: priceRCE, g11Price: g11Rate };
      });

      hourlyAggregation.forEach((d, h) => {
        if(d.count > 0) {
          if(d.cost > stats.worstHourCost) { stats.worstHourCost = d.cost; stats.worstHour = h; }
          const avgP = d.priceSum / d.count;
          if(avgP < stats.bestHourPrice) { stats.bestHourPrice = avgP; stats.bestHour = h; }
        }
      });
    } catch (e) { console.error(e); }
  }

  // 3. Pobieranie Danych z Giełdy RCE (PSE API) dla Radaru i API
  let todayForecast = null;
  let tomorrowForecast = null;
  let forecastError = null;
  
  if (activeTab === 'radar' || activeTab === 'api') {
    try {
      const polandTime = new Date(new Date().toLocaleString("en-US", {timeZone: "Europe/Warsaw"}));
      const todayStr = `${polandTime.getFullYear()}-${String(polandTime.getMonth() + 1).padStart(2, '0')}-${String(polandTime.getDate()).padStart(2, '0')}`;
      
      const tomorrowTime = new Date(polandTime);
      tomorrowTime.setDate(tomorrowTime.getDate() + 1);
      const tomorrowStr = `${tomorrowTime.getFullYear()}-${String(tomorrowTime.getMonth() + 1).padStart(2, '0')}-${String(tomorrowTime.getDate()).padStart(2, '0')}`;

      // Funkcja pomocnicza do pobierania i przeliczania danego dnia
      const fetchPseData = async (targetDateStr: string, dateLabel: string) => {
        const params = new URLSearchParams({ "$filter": `business_date eq '${targetDateStr}'` });
        const pseRes = await fetch(`https://api.raporty.pse.pl/api/rce-pln?${params.toString()}`, { cache: 'no-store' });
        const json = pseRes.ok ? await pseRes.json() : { value: [] };

        if (json.value?.length > 0) {
          let pArr = json.value.map((r: any) => {
            let hour = '??:??';
            const timeStr = String(r.dtime || r.udtczas || r.udtczas_oreb || r.data_czas || '');
            const timeMatch = timeStr.match(/(\d{2}:\d{2})/);
            
            if (timeMatch) { 
              hour = timeMatch[1]; 
            } else if (r.period !== undefined || r.okres !== undefined) {
              const p = parseInt(r.period || r.okres);
              if (p > 25) { 
                const h = Math.floor((p - 1) / 4);
                const m = ((p - 1) % 4) * 15;
                hour = String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
              } else { 
                hour = String(p - 1).padStart(2, '0') + ':00'; 
              }
            } else if (r.godzina !== undefined) { 
              hour = String(r.godzina).padStart(2, '0') + ':00'; 
            }
            return { time: hour, price: r.rce_pln / 1000 };
          });

          const isQuarterHourly = pArr.length > 30;
          const elementsIn3Hours = isQuarterHourly ? 12 : 3;

          let bestWindowStart = '', bestWindowEnd = '', bestWindowAvgPrice = 9999;
          let worstWindowStart = '', worstWindowEnd = '', worstWindowAvgPrice = -9999;

          for (let i = 0; i <= pArr.length - elementsIn3Hours; i++) {
            let sum = 0;
            for (let j = 0; j < elementsIn3Hours; j++) sum += pArr[i + j].price;
            const avg = sum / elementsIn3Hours;

            if (avg < bestWindowAvgPrice) {
              bestWindowAvgPrice = avg;
              bestWindowStart = pArr[i].time;
              let endHour = parseInt(pArr[i + elementsIn3Hours - 1].time.split(':')[0]);
              let endMin = parseInt(pArr[i + elementsIn3Hours - 1].time.split(':')[1] || '0', 10);
              if (isQuarterHourly) { endMin += 15; if (endMin >= 60) { endHour += 1; endMin = 0; } } else { endHour += 1; }
              if (endHour >= 24) endHour = 0;
              bestWindowEnd = `${String(endHour).padStart(2, '0')}:${String(endMin).padStart(2, '0')}`;
            }

            if (avg > worstWindowAvgPrice) {
              worstWindowAvgPrice = avg;
              worstWindowStart = pArr[i].time;
              let endHour = parseInt(pArr[i + elementsIn3Hours - 1].time.split(':')[0]);
              let endMin = parseInt(pArr[i + elementsIn3Hours - 1].time.split(':')[1] || '0', 10);
              if (isQuarterHourly) { endMin += 15; if (endMin >= 60) { endHour += 1; endMin = 0; } } else { endHour += 1; }
              if (endHour >= 24) endHour = 0;
              worstWindowEnd = `${String(endHour).padStart(2, '0')}:${String(endMin).padStart(2, '0')}`;
            }
          }

          return { 
            prices: pArr, date: targetDateStr, dateLabel,
            absoluteMinPrice: Math.min(...pArr.map(p=>p.price)), 
            absoluteMaxPrice: Math.max(...pArr.map(p=>p.price)), 
            bestWindowStart, bestWindowEnd, bestWindowAvgPrice, 
            worstWindowStart, worstWindowEnd, worstWindowAvgPrice 
          };
        }
        return null;
      };

      // Pobieramy równolegle dzisiaj i jutro
      const [todayData, tomorrowData] = await Promise.all([
        fetchPseData(todayStr, "Dzisiaj"),
        fetchPseData(tomorrowStr, "Jutro")
      ]);

      todayForecast = todayData;
      tomorrowForecast = tomorrowData;

      if (!todayForecast && !tomorrowForecast) {
        forecastError = "PSE jeszcze nie opublikowało cen na dziś ani na jutro.";
      }

    } catch (e) { forecastError = "Błąd połączenia z PSE."; }
  }

  // ============================================================================
  // RENDEROWANIE GŁÓWNEGO LAYOUTU APLIKACJI I DYSTRYBUCJA ZAKŁADEK
  // ============================================================================
  return (
    <div className="min-h-screen w-full bg-slate-50 font-sans text-slate-900 pb-20">
      <style dangerouslySetInnerHTML={{__html: globalStyles}} />
      
      {/* Topbar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 h-16 flex justify-between items-center">
          <div className="flex items-center gap-2 font-black text-xl text-slate-800">
            <IconZap /> EnergyOptimizer
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
        
        {/* Nawigacja Zakładek */}
        <nav className="grid grid-cols-2 md:flex md:flex-row gap-2 p-1.5 bg-slate-200/50 backdrop-blur-sm rounded-2xl border border-slate-200 mb-10">
          {[
            { id: 'radar', label: 'Radar na dziś 🟢', short: 'Radar 🟢' },
            { id: 'history', label: 'Profil Historyczny', short: 'Historia' },
            { id: 'advisor', label: 'Doradca Taryfowy', short: 'Doradca' },
            { id: 'api', label: 'API Automatyzacji 🔌', short: 'API 🔌' }
          ].map(tab => (
            <Link 
              key={tab.id} 
              href={`/?tab=${tab.id}&days=${days}&provider=${selectedProvider}`}
              className={`flex items-center justify-center px-2 py-3 md:px-6 md:py-3 rounded-xl font-bold text-xs sm:text-sm transition-all ${
                activeTab === tab.id 
                  ? 'bg-white text-blue-600 shadow-sm border border-slate-200/50' 
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200'
              }`}
            >
              {/* Pełna nazwa dla komputerów (md:inline), skrócona nazwa dla telefonów (md:hidden) */}
              <span className="hidden md:inline">{tab.label}</span>
              <span className="md:hidden">{tab.short}</span>
            </Link>
          ))}
        </nav>

        {/* Dynamiczne Renderowanie Komponentów Zakładek */}
        <div className="animate-fade-in-up">
          {activeTab === 'radar' && (
            <TabRadar isPremiumUser={isPremiumUser} todayForecast={todayForecast} tomorrowForecast={tomorrowForecast} forecastError={forecastError} />
          )}
          {activeTab === 'history' && (
            <TabHistory days={days} chartData={chartData} dataRange={dataRange} />
          )}
          {activeTab === 'advisor' && (
            <TabAdvisor days={days} selectedProvider={selectedProvider} displayProviders={displayProviders} chartData={chartData} stats={stats} />
          )}
          {activeTab === 'api' && (
            <TabApi userApiKey={userApiKey} todayForecast={todayForecast} />
          )}
        </div>
      </main>
    </div>
  );
}