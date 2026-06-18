import React from 'react';

interface SavingsSummary {
  runs: number;
  energyKwh: number;
  actualCostPln: number;
  referenceCostPln: number;
  savingsPln: number;
  estimatedRuns: number;
}

interface DeviceStat extends SavingsSummary {
  deviceName: string;
}

interface DailyStat {
  date: string;
  runs: number;
  energyKwh: number;
  savingsPln: number;
}

interface SavingsReport {
  id: string | number;
  deviceName: string;
  startedAt: string | Date;
  endedAt: string | Date;
  energyKwh: number;
  actualCostPln: number;
  referenceCostPln: number;
  savingsPln: number;
  averagePricePlnKwh: number;
  energySource: string | null;
  estimated: boolean;
}

interface Execution {
  executionId: string;
  deviceName: string;
  status: string;
  startedAt: string | Date;
  endedAt: string | Date | null;
  energyKwh: number | null;
  energySource: string | null;
}

interface DashboardData {
  allTime: SavingsSummary;
  month: SavingsSummary;
  devices: DeviceStat[];
  daily: DailyStat[];
  reports: SavingsReport[];
  executions: Execution[];
}

interface Props {
  isPremiumUser: boolean;
  data: DashboardData;
  loadError?: string | null;
}

const EMPTY_SUMMARY: SavingsSummary = {
  runs: 0,
  energyKwh: 0,
  actualCostPln: 0,
  referenceCostPln: 0,
  savingsPln: 0,
  estimatedRuns: 0
};

function money(value: number): string {
  return new Intl.NumberFormat('pl-PL', {
    style: 'currency',
    currency: 'PLN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(Number(value || 0));
}

function number(value: number, digits = 2): string {
  return new Intl.NumberFormat('pl-PL', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  }).format(Number(value || 0));
}

function dateTime(value: string | Date | null): string {
  if (!value) return '—';
  const date = value instanceof Date ? value : new Date(value);
  return date.toLocaleString('pl-PL', {
    timeZone: 'Europe/Warsaw',
    dateStyle: 'short',
    timeStyle: 'short'
  });
}

function sourceLabel(source: string | null): string {
  if (source === 'meter_delta') return 'różnica licznika';
  if (source === 'reported') return 'energia raportowana';
  if (source === 'power_duration') return 'moc × czas';
  return 'raport pełny';
}

function Metric({ label, value, note, positive = false }: { label: string; value: string; note?: string; positive?: boolean }) {
  return (
    <div className={`rounded-3xl border p-5 shadow-sm ${positive ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-white'}`}>
      <p className="text-xs font-black uppercase tracking-wider text-slate-500">{label}</p>
      <p className={`mt-2 text-3xl font-black ${positive ? 'text-emerald-700' : 'text-slate-900'}`}>{value}</p>
      {note && <p className="mt-1 text-xs text-slate-500">{note}</p>}
    </div>
  );
}

export default function TabSavings({ isPremiumUser, data, loadError }: Props) {
  if (!isPremiumUser) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="mb-4 text-4xl">🔒</div>
        <h3 className="mb-2 text-2xl font-bold">Funkcja PRO</h3>
        <p className="text-slate-500">Raport faktycznych oszczędności jest dostępny w pakiecie PRO.</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="rounded-3xl border border-amber-200 bg-amber-50 p-8 shadow-sm">
        <h3 className="text-2xl font-black text-amber-900">Raport nie jest jeszcze aktywny</h3>
        <p className="mt-2 text-amber-900">Uruchom migrację sesji urządzeń w bazie i odśwież stronę.</p>
        <details className="mt-4 text-sm text-amber-800">
          <summary className="cursor-pointer font-bold">Szczegóły techniczne</summary>
          <pre className="mt-2 overflow-x-auto whitespace-pre-wrap rounded-xl bg-white/70 p-3">{loadError}</pre>
        </details>
      </div>
    );
  }

  const allTime = data.allTime || EMPTY_SUMMARY;
  const month = data.month || EMPTY_SUMMARY;
  const savingsPercent = allTime.referenceCostPln > 0
    ? allTime.savingsPln / allTime.referenceCostPln * 100
    : 0;
  const maxDaily = Math.max(0.01, ...data.daily.map((item) => Math.abs(item.savingsPln)));

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-widest text-emerald-600">Rzeczywiste wykonania</p>
            <h2 className="mt-1 text-3xl font-black">Oszczędności urządzeń</h2>
            <p className="mt-2 max-w-3xl leading-6 text-slate-600">
              Wyniki powstają z cykli zgłoszonych przez Home Assistanta. Koszt dotyczy komponentu rynkowego energii i nie obejmuje dystrybucji ani opłat stałych.
            </p>
          </div>
          <span className="h-fit rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">DANE WYKONANE</span>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Metric label="Oszczędność łącznie" value={money(allTime.savingsPln)} note={`${number(savingsPercent, 1)}% względem stawki odniesienia`} positive={allTime.savingsPln >= 0} />
        <Metric label="Wykonane cykle" value={String(allTime.runs)} note={`${allTime.estimatedRuns} z energią estymowaną`} />
        <Metric label="Przesunięta energia" value={`${number(allTime.energyKwh)} kWh`} />
        <Metric label="Koszt rzeczywisty" value={money(allTime.actualCostPln)} />
        <Metric label="Oszczędność w miesiącu" value={money(month.savingsPln)} note={`${month.runs} cykli`} positive={month.savingsPln >= 0} />
      </section>

      {data.executions.length > 0 && (
        <section className="rounded-3xl border border-blue-200 bg-blue-50 p-6 shadow-sm">
          <h3 className="text-xl font-black text-blue-950">Aktywne i oczekujące cykle</h3>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {data.executions.map((execution) => (
              <div key={execution.executionId} className="rounded-2xl border border-blue-200 bg-white p-4">
                <div className="flex items-center justify-between gap-3">
                  <strong>{execution.deviceName}</strong>
                  <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-black text-blue-800">{execution.status}</span>
                </div>
                <p className="mt-2 text-sm text-slate-600">Start: {dateTime(execution.startedAt)}</p>
                {execution.endedAt && <p className="text-sm text-slate-600">Koniec: {dateTime(execution.endedAt)}</p>}
                {execution.energyKwh !== null && <p className="text-sm text-slate-600">Energia: {number(execution.energyKwh)} kWh</p>}
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="grid gap-6 xl:grid-cols-5">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm xl:col-span-3">
          <h3 className="text-xl font-black">Ostatnie 30 dni</h3>
          <div className="mt-5 space-y-3">
            {data.daily.length === 0 && <p className="text-sm text-slate-500">Brak zakończonych cykli.</p>}
            {data.daily.map((item) => {
              const width = Math.max(2, Math.abs(item.savingsPln) / maxDaily * 100);
              return (
                <div key={item.date} className="grid grid-cols-[90px_1fr_100px] items-center gap-3 text-sm">
                  <span className="font-semibold text-slate-600">{new Date(`${item.date}T12:00:00`).toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit' })}</span>
                  <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                    <div className={`h-full rounded-full ${item.savingsPln >= 0 ? 'bg-emerald-500' : 'bg-red-500'}`} style={{ width: `${width}%` }} />
                  </div>
                  <span className={`text-right font-black ${item.savingsPln >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>{money(item.savingsPln)}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm xl:col-span-2">
          <h3 className="text-xl font-black">Według urządzenia</h3>
          <div className="mt-4 space-y-3">
            {data.devices.length === 0 && <p className="text-sm text-slate-500">Brak danych urządzeń.</p>}
            {data.devices.map((device) => (
              <div key={device.deviceName} className="rounded-2xl bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <strong>{device.deviceName}</strong>
                  <span className={`font-black ${device.savingsPln >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>{money(device.savingsPln)}</span>
                </div>
                <p className="mt-1 text-xs text-slate-500">{device.runs} cykli · {number(device.energyKwh)} kWh · {device.estimatedRuns} estymowanych</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-xl font-black">Ostatnie wykonania</h3>
        <div className="mt-4 overflow-x-auto">
          {data.reports.length === 0 ? (
            <p className="text-sm text-slate-500">Nie zgłoszono jeszcze żadnego zakończonego cyklu.</p>
          ) : (
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="border-b border-slate-200 text-xs uppercase text-slate-500">
                <tr><th className="pb-3">Urządzenie</th><th className="pb-3">Start</th><th className="pb-3">Koniec</th><th className="pb-3">Energia</th><th className="pb-3">Koszt</th><th className="pb-3">Odniesienie</th><th className="pb-3">Oszczędność</th><th className="pb-3">Pomiar</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.reports.map((report) => (
                  <tr key={report.id}>
                    <td className="py-3 font-bold">{report.deviceName}</td>
                    <td className="py-3">{dateTime(report.startedAt)}</td>
                    <td className="py-3">{dateTime(report.endedAt)}</td>
                    <td className="py-3">{number(report.energyKwh)} kWh</td>
                    <td className="py-3">{money(report.actualCostPln)}</td>
                    <td className="py-3">{money(report.referenceCostPln)}</td>
                    <td className={`py-3 font-black ${report.savingsPln >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>{money(report.savingsPln)}</td>
                    <td className="py-3"><span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold">{sourceLabel(report.energySource)}{report.estimated ? ' · estymacja' : ''}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}
