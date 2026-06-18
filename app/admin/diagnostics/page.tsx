export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { auth } from '@clerk/nextjs/server';
import { notFound } from 'next/navigation';
import { pool } from '../../../lib/db';
import { isAdminUser } from '../../../lib/adminAccess';

type EventRow = {
  id: string;
  created_at: Date;
  level: string;
  source: string;
  event_type: string;
  message: string;
  user_id: string | null;
  request_id: string | null;
  metadata: Record<string, unknown>;
  resolved_at: Date | null;
};

function formatDate(value: Date | string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleString('pl-PL', {
    timeZone: 'Europe/Warsaw',
    dateStyle: 'short',
    timeStyle: 'medium'
  });
}

function levelClasses(level: string): string {
  if (level === 'critical') return 'bg-red-100 text-red-800 border-red-200';
  if (level === 'error') return 'bg-orange-100 text-orange-800 border-orange-200';
  if (level === 'warning') return 'bg-amber-100 text-amber-800 border-amber-200';
  return 'bg-emerald-100 text-emerald-800 border-emerald-200';
}

export default async function DiagnosticsPage() {
  const { userId } = auth();
  if (!isAdminUser(userId)) notFound();

  let events: EventRow[] = [];
  let levelCounts: Record<string, number> = {};
  let sourceCounts: Array<{ source: string; count: number }> = [];
  let unresolvedCount = 0;
  let inconsistentSubscriptions: Array<Record<string, unknown>> = [];
  let databaseError: string | null = null;

  try {
    const [eventsResult, levelsResult, sourcesResult, unresolvedResult, subscriptionsResult] = await Promise.all([
      pool.query<EventRow>(`
        SELECT id, created_at, level, source, event_type, message,
               user_id, request_id, metadata, resolved_at
        FROM app_events
        ORDER BY created_at DESC
        LIMIT 100
      `),
      pool.query<{ level: string; count: string }>(`
        SELECT level, COUNT(*)::text AS count
        FROM app_events
        WHERE created_at >= NOW() - INTERVAL '24 hours'
        GROUP BY level
      `),
      pool.query<{ source: string; count: string }>(`
        SELECT source, COUNT(*)::text AS count
        FROM app_events
        WHERE created_at >= NOW() - INTERVAL '24 hours'
        GROUP BY source
        ORDER BY COUNT(*) DESC
        LIMIT 10
      `),
      pool.query<{ count: string }>(`
        SELECT COUNT(*)::text AS count
        FROM app_events
        WHERE resolved_at IS NULL AND level IN ('error', 'critical')
      `),
      pool.query(`
        SELECT user_id, is_active, current_period_end,
               stripe_subscription_id, access_token_last_used_at,
               CASE
                 WHEN is_active = TRUE AND current_period_end IS NOT NULL AND current_period_end < NOW()
                   THEN 'active_but_expired'
                 WHEN is_active = FALSE AND current_period_end IS NOT NULL AND current_period_end > NOW()
                   THEN 'inactive_before_period_end'
               END AS issue
        FROM user_subscriptions
        WHERE (is_active = TRUE AND current_period_end IS NOT NULL AND current_period_end < NOW())
           OR (is_active = FALSE AND current_period_end IS NOT NULL AND current_period_end > NOW())
        ORDER BY current_period_end DESC NULLS LAST
      `)
    ]);

    events = eventsResult.rows;
    levelCounts = Object.fromEntries(levelsResult.rows.map((row) => [row.level, Number(row.count)]));
    sourceCounts = sourcesResult.rows.map((row) => ({ source: row.source, count: Number(row.count) }));
    unresolvedCount = Number(unresolvedResult.rows[0]?.count || 0);
    inconsistentSubscriptions = subscriptionsResult.rows;
  } catch (error) {
    databaseError = error instanceof Error ? error.message : String(error);
  }

  const total24h = Object.values(levelCounts).reduce((sum, value) => sum + value, 0);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900 md:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-widest text-emerald-600">Administracja</p>
            <h1 className="mt-1 text-3xl font-black">Diagnostyka EnergyOptimizer</h1>
            <p className="mt-2 text-slate-600">Zdarzenia aplikacji, błędy i niespójności subskrypcji.</p>
          </div>
          <Link href="/" className="w-fit rounded-xl border border-slate-200 bg-white px-4 py-2 font-bold text-slate-700 shadow-sm hover:bg-slate-100">
            ← Wróć do aplikacji
          </Link>
        </div>

        {databaseError ? (
          <section className="rounded-3xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
            <h2 className="text-xl font-black text-amber-900">Monitoring nie jest jeszcze aktywny</h2>
            <p className="mt-2 text-amber-900">
              Uruchom w Neon migrację <code className="font-mono">migrations/20260618_app_events.sql</code>.
            </p>
            <details className="mt-4 text-sm text-amber-800">
              <summary className="cursor-pointer font-bold">Szczegóły techniczne</summary>
              <pre className="mt-2 overflow-x-auto whitespace-pre-wrap rounded-xl bg-white/70 p-3">{databaseError}</pre>
            </details>
          </section>
        ) : (
          <>
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
              <Metric label="Zdarzenia / 24 h" value={total24h} />
              <Metric label="Błędy / 24 h" value={(levelCounts.error || 0) + (levelCounts.critical || 0)} danger />
              <Metric label="Ostrzeżenia / 24 h" value={levelCounts.warning || 0} warning />
              <Metric label="Nierozwiązane" value={unresolvedCount} danger={unresolvedCount > 0} />
              <Metric label="Niespójne PRO" value={inconsistentSubscriptions.length} danger={inconsistentSubscriptions.length > 0} />
            </section>

            <section className="mt-6 grid gap-6 lg:grid-cols-3">
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-1">
                <h2 className="text-lg font-black">Źródła zdarzeń / 24 h</h2>
                <div className="mt-4 space-y-3">
                  {sourceCounts.length === 0 && <p className="text-sm text-slate-500">Brak zdarzeń.</p>}
                  {sourceCounts.map((item) => (
                    <div key={item.source} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-4 py-3">
                      <span className="font-mono text-sm">{item.source}</span>
                      <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-black">{item.count}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
                <h2 className="text-lg font-black">Niespójności subskrypcji</h2>
                <div className="mt-4 overflow-x-auto">
                  {inconsistentSubscriptions.length === 0 ? (
                    <p className="text-sm text-slate-500">Nie wykryto niespójności.</p>
                  ) : (
                    <table className="w-full min-w-[680px] text-left text-sm">
                      <thead className="text-xs uppercase text-slate-500"><tr><th className="pb-3">Użytkownik</th><th className="pb-3">Problem</th><th className="pb-3">Aktywna</th><th className="pb-3">Koniec okresu</th><th className="pb-3">Ostatnie API</th></tr></thead>
                      <tbody className="divide-y divide-slate-100">
                        {inconsistentSubscriptions.map((row) => (
                          <tr key={String(row.user_id)}>
                            <td className="py-3 font-mono text-xs">{String(row.user_id)}</td>
                            <td className="py-3 font-semibold text-red-700">{String(row.issue)}</td>
                            <td className="py-3">{String(row.is_active)}</td>
                            <td className="py-3">{formatDate(row.current_period_end as Date | null)}</td>
                            <td className="py-3">{formatDate(row.access_token_last_used_at as Date | null)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </section>

            <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-black">Ostatnie zdarzenia</h2>
                <span className="text-xs font-semibold text-slate-500">maks. 100</span>
              </div>
              <div className="mt-4 space-y-3">
                {events.length === 0 && <p className="text-sm text-slate-500">Brak zapisanych zdarzeń.</p>}
                {events.map((event) => (
                  <details key={event.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 open:bg-white">
                    <summary className="cursor-pointer list-none">
                      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`rounded-full border px-2 py-0.5 text-xs font-black uppercase ${levelClasses(event.level)}`}>{event.level}</span>
                          <span className="font-mono text-xs font-bold text-slate-500">{event.source}</span>
                          <span className="font-mono text-xs text-slate-400">{event.event_type}</span>
                        </div>
                        <time className="text-xs font-semibold text-slate-500">{formatDate(event.created_at)}</time>
                      </div>
                      <p className="mt-2 font-semibold text-slate-800">{event.message}</p>
                    </summary>
                    <div className="mt-4 grid gap-3 text-xs text-slate-600 md:grid-cols-3">
                      <p><strong>Użytkownik:</strong> <span className="font-mono">{event.user_id || '—'}</span></p>
                      <p><strong>Request ID:</strong> <span className="font-mono">{event.request_id || '—'}</span></p>
                      <p><strong>Rozwiązane:</strong> {formatDate(event.resolved_at)}</p>
                    </div>
                    <pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap rounded-xl bg-slate-900 p-4 text-xs text-slate-100">{JSON.stringify(event.metadata || {}, null, 2)}</pre>
                  </details>
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}

function Metric({ label, value, danger = false, warning = false }: { label: string; value: number; danger?: boolean; warning?: boolean }) {
  const classes = danger
    ? 'border-red-200 bg-red-50 text-red-900'
    : warning
      ? 'border-amber-200 bg-amber-50 text-amber-900'
      : 'border-slate-200 bg-white text-slate-900';

  return (
    <div className={`rounded-3xl border p-5 shadow-sm ${classes}`}>
      <p className="text-xs font-black uppercase tracking-wider opacity-70">{label}</p>
      <p className="mt-2 text-3xl font-black">{value}</p>
    </div>
  );
}
