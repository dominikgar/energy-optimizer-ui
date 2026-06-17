import React from 'react';
import Link from 'next/link';

const IconTrendingDown = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-500"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>;
const IconClock = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-500"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;

interface DynamicOfferConfig {
  marketMultiplier: number;
  marginPerKwh: number;
  variableFeePerKwh: number;
  monthlyFee: number;
  vatPercent: number;
  floorNegativeMarketPricesAtZero: boolean;
}

interface CostBreakdown {
  marketEnergyCost: number;
  marginCost: number;
  variableFeeCost: number;
  proratedMonthlyFee: number;
  netSubtotal: number;
  vatCost: number;
  totalCost: number;
  averageCostPerKwh: number;
}

interface TabAdvisorProps {
  days: number;
  selectedProvider: string;
  displayProviders: any[];
  chartData: any[];
  dynamicOfferConfig: DynamicOfferConfig;
  stats: {
    totalKwh: number;
    costG11: number;
    costRCE: number;
    costDynamic: number;
    difference: number;
    dynamicBreakdown: CostBreakdown | null;
    worstHour: number;
    worstHourCost: number;
    bestHour: number;
    bestHourPrice: number;
  };
}

function offerQuery(config: DynamicOfferConfig): string {
  return new URLSearchParams({
    multiplier: String(config.marketMultiplier),
    margin: String(config.marginPerKwh),
    variableFee: String(config.variableFeePerKwh),
    monthlyFee: String(config.monthlyFee),
    vat: String(config.vatPercent),
    negativePrices: config.floorNegativeMarketPricesAtZero ? 'floor' : 'pass'
  }).toString();
}

export default function TabAdvisor({
  days,
  selectedProvider,
  displayProviders,
  chartData,
  stats,
  dynamicOfferConfig
}: TabAdvisorProps) {
  const configQuery = offerQuery(dynamicOfferConfig);
  const dynamicCheaper = stats.difference > 0;

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-2">
        <div>
          <h2 className="text-3xl font-black">Kalkulator oferty dynamicznej</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
            Wpisz parametry z cennika sprzedawcy. Silnik doliczy mnożnik ceny rynkowej, marżę, opłatę zmienną, część opłaty miesięcznej oraz wskazany VAT.
          </p>
        </div>
        <div className="flex bg-slate-200/50 p-1 rounded-xl">
          {[3, 7, 30].map((value) => (
            <Link
              key={value}
              href={`/?tab=advisor&days=${value}&provider=${selectedProvider}&${configQuery}`}
              scroll={false}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${days === value ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
            >
              {value} dni
            </Link>
          ))}
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 p-5 rounded-2xl text-sm leading-6 text-amber-900">
        <strong>Jak wpisywać stawki:</strong> użyj jednostek podanych w ofercie. Jeśli ceny i opłaty są już brutto, pozostaw VAT równy 0%. Dystrybucja nie jest jeszcze częścią tego modelu.
      </div>

      <form method="GET" className="bg-white p-6 md:p-8 rounded-[32px] border border-slate-200 shadow-xl shadow-slate-200/40">
        <input type="hidden" name="tab" value="advisor" />
        <input type="hidden" name="days" value={days} />
        <input type="hidden" name="provider" value={selectedProvider} />

        <div className="mb-6">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-3">Stawka G11 jako punkt odniesienia</span>
          <div className="flex flex-wrap gap-2">
            {displayProviders.map((tariff) => (
              <Link
                key={tariff.tariff_name}
                href={`/?tab=advisor&days=${days}&provider=${tariff.tariff_name}&${configQuery}`}
                scroll={false}
                className={`px-4 py-2 rounded-full text-sm font-bold border transition-all ${
                  selectedProvider === tariff.tariff_name
                    ? 'bg-amber-500 text-white border-amber-600 shadow-md'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {tariff.tariff_name.replace('G11_', '')}
              </Link>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <label className="text-sm font-bold text-slate-700">
            Mnożnik RCE
            <input name="multiplier" type="number" min="0" max="10" step="0.01" defaultValue={dynamicOfferConfig.marketMultiplier} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal" />
            <span className="mt-1 block text-xs font-normal text-slate-400">Np. 1 oznacza 100% ceny RCE.</span>
          </label>
          <label className="text-sm font-bold text-slate-700">
            Marża sprzedawcy [PLN/kWh]
            <input name="margin" type="number" min="-5" max="5" step="0.001" defaultValue={dynamicOfferConfig.marginPerKwh} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal" />
          </label>
          <label className="text-sm font-bold text-slate-700">
            Inna opłata zmienna [PLN/kWh]
            <input name="variableFee" type="number" min="-5" max="5" step="0.001" defaultValue={dynamicOfferConfig.variableFeePerKwh} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal" />
          </label>
          <label className="text-sm font-bold text-slate-700">
            Opłata miesięczna [PLN]
            <input name="monthlyFee" type="number" min="0" max="1000" step="0.01" defaultValue={dynamicOfferConfig.monthlyFee} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal" />
          </label>
          <label className="text-sm font-bold text-slate-700">
            VAT [%]
            <input name="vat" type="number" min="0" max="100" step="0.1" defaultValue={dynamicOfferConfig.vatPercent} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal" />
          </label>
          <label className="text-sm font-bold text-slate-700">
            Ceny ujemne
            <select name="negativePrices" defaultValue={dynamicOfferConfig.floorNegativeMarketPricesAtZero ? 'floor' : 'pass'} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal bg-white">
              <option value="pass">Przekazywane klientowi</option>
              <option value="floor">Minimalna cena 0 PLN</option>
            </select>
          </label>
        </div>

        <button type="submit" className="mt-6 rounded-xl bg-blue-600 px-6 py-3 font-bold text-white hover:bg-blue-700 transition-colors">
          Przelicz ofertę
        </button>
      </form>

      {chartData.length > 0 && stats.dynamicBreakdown ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="p-7 rounded-3xl border-2 border-slate-100 bg-white">
              <div className="text-slate-400 font-bold uppercase text-xs mb-2">Wybrana stawka G11</div>
              <div className="text-3xl font-black text-slate-800">{stats.costG11.toFixed(2)} PLN</div>
            </div>
            <div className="p-7 rounded-3xl border-2 border-blue-100 bg-blue-50">
              <div className="text-blue-600 font-bold uppercase text-xs mb-2">Skonfigurowana oferta dynamiczna</div>
              <div className="text-3xl font-black text-blue-700">{stats.costDynamic.toFixed(2)} PLN</div>
              <div className="mt-2 text-xs text-blue-600">Średnio {stats.dynamicBreakdown.averageCostPerKwh.toFixed(3)} PLN/kWh</div>
            </div>
            <div className={`p-7 rounded-3xl border-2 ${dynamicCheaper ? 'border-emerald-100 bg-emerald-50' : 'border-red-100 bg-red-50'}`}>
              <div className={`font-bold uppercase text-xs mb-2 ${dynamicCheaper ? 'text-emerald-600' : 'text-red-600'}`}>Różnica w analizowanym okresie</div>
              <div className={`text-3xl font-black ${dynamicCheaper ? 'text-emerald-700' : 'text-red-700'}`}>
                {Math.abs(stats.difference).toFixed(2)} PLN
              </div>
              <div className={`mt-2 text-xs ${dynamicCheaper ? 'text-emerald-600' : 'text-red-600'}`}>
                {dynamicCheaper ? 'Model dynamiczny tańszy' : stats.difference < 0 ? 'G11 tańsza' : 'Koszt równy'}
              </div>
            </div>
          </div>

          <div className="bg-white p-7 rounded-3xl border border-slate-200 shadow-sm">
            <h3 className="text-xl font-black mb-5">Rozbicie kosztu oferty dynamicznej</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <div><span className="text-slate-400 block">Cena rynkowa</span><strong>{stats.dynamicBreakdown.marketEnergyCost.toFixed(2)} PLN</strong></div>
              <div><span className="text-slate-400 block">Marża</span><strong>{stats.dynamicBreakdown.marginCost.toFixed(2)} PLN</strong></div>
              <div><span className="text-slate-400 block">Opłata zmienna</span><strong>{stats.dynamicBreakdown.variableFeeCost.toFixed(2)} PLN</strong></div>
              <div><span className="text-slate-400 block">Część opłaty miesięcznej</span><strong>{stats.dynamicBreakdown.proratedMonthlyFee.toFixed(2)} PLN</strong></div>
              <div><span className="text-slate-400 block">VAT</span><strong>{stats.dynamicBreakdown.vatCost.toFixed(2)} PLN</strong></div>
              <div><span className="text-slate-400 block">Surowy RCE bez dodatków</span><strong>{stats.costRCE.toFixed(2)} PLN</strong></div>
            </div>
          </div>
        </>
      ) : (
        <p className="text-slate-500 p-8 text-center bg-white rounded-2xl border border-slate-200">Wgraj dane w zakładce Historia, aby wykonać obliczenia.</p>
      )}

      {chartData.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm flex items-start gap-4">
            <div className="p-3 bg-red-100 rounded-xl text-red-500"><IconTrendingDown /></div>
            <div>
              <h4 className="text-lg font-bold text-slate-800">Najwyższy koszt godzinowy</h4>
              <p className="text-slate-500 text-sm mt-1">W analizowanym zakresie najwięcej kosztowała łącznie godzina <strong>{String(stats.worstHour).padStart(2, '0')}:00</strong>: <strong className="text-red-500">{stats.worstHourCost.toFixed(2)} PLN</strong> według surowego RCE.</p>
            </div>
          </div>
          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm flex items-start gap-4">
            <div className="p-3 bg-emerald-100 rounded-xl text-emerald-500"><IconClock /></div>
            <div>
              <h4 className="text-lg font-bold text-slate-800">Najtańsza średnia godzina</h4>
              <p className="text-slate-500 text-sm mt-1">Najniższa średnia surowa cena RCE występowała około <strong>{String(stats.bestHour).padStart(2, '0')}:00</strong> i wynosiła <strong className="text-emerald-500">{stats.bestHourPrice.toFixed(3)} PLN/kWh</strong>.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
