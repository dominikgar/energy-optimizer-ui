'use client';

import React, { useEffect, useState } from 'react';
import ApiDeviceConfigurator from './ApiDeviceConfigurator';
import SavingsSummaryConfigurator from './SavingsSummaryConfigurator';

interface Props {
  userApiKey: string | null;
}

interface AccessState {
  loading: boolean;
  entitled: boolean;
  mode: 'none' | 'legacy' | 'hashed';
  prefix: string | null;
  token: string | null;
  error: string | null;
}

export default function TabApi({ userApiKey }: Props) {
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [access, setAccess] = useState<AccessState>({
    loading: !userApiKey,
    entitled: Boolean(userApiKey),
    mode: userApiKey ? 'legacy' : 'none',
    prefix: userApiKey ? `${userApiKey.slice(0, 16)}…` : null,
    token: userApiKey,
    error: null
  });

  useEffect(() => {
    fetch('/api/access-token', { cache: 'no-store' })
      .then(async (response) => {
        const data = await response.json();
        if (response.status === 403) {
          setAccess((current) => ({ ...current, loading: false, entitled: false }));
          return;
        }
        if (!response.ok) throw new Error(data.error || 'Nie udało się odczytać tokenu.');
        setAccess({
          loading: false,
          entitled: true,
          mode: data.mode,
          prefix: data.prefix,
          token: data.legacy_token || null,
          error: null
        });
      })
      .catch((error) => setAccess((current) => ({
        ...current,
        loading: false,
        error: error instanceof Error ? error.message : String(error)
      })));
  }, []);

  const copyToken = async () => {
    if (!access.token) return;
    await navigator.clipboard.writeText(access.token);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  const changeToken = async () => {
    setBusy(true);
    try {
      const response = await fetch('/api/access-token', { method: 'POST' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Nie udało się wygenerować tokenu.');
      setAccess({ loading: false, entitled: true, mode: 'hashed', prefix: data.prefix, token: data.token, error: null });
    } catch (error) {
      setAccess((current) => ({ ...current, error: error instanceof Error ? error.message : String(error) }));
    } finally {
      setBusy(false);
    }
  };

  const revokeToken = async () => {
    setBusy(true);
    try {
      const response = await fetch('/api/access-token', { method: 'DELETE' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Nie udało się unieważnić tokenu.');
      setAccess({ loading: false, entitled: true, mode: 'none', prefix: null, token: null, error: null });
    } catch (error) {
      setAccess((current) => ({ ...current, error: error instanceof Error ? error.message : String(error) }));
    } finally {
      setBusy(false);
    }
  };

  if (access.loading) {
    return <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center font-semibold text-slate-500">Sprawdzam dostęp do API…</div>;
  }

  if (!access.entitled) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="mb-4 text-4xl">🔒</div>
        <h3 className="mb-2 text-2xl font-bold">Funkcja PRO</h3>
        <p className="text-slate-500">API automatyzacji jest dostępne tylko w pakiecie PRO.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <h2 className="mb-3 text-2xl font-black">API automatyzacji</h2>
        <p className="mb-6 max-w-4xl leading-relaxed text-slate-600">
          Token jest traktowany jak hasło. Generator konfiguracji poniżej celowo używa znacznika zamiast wstawiać token do kopiowanego kodu.
        </p>
        {access.error && <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-800">{access.error}</div>}

        {access.mode === 'none' ? (
          <button type="button" disabled={busy} onClick={changeToken} className="rounded-xl bg-blue-600 px-5 py-3 font-bold text-white disabled:opacity-50">Generuj token</button>
        ) : (
          <>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input readOnly value={access.token || access.prefix || ''} type={access.token ? 'text' : 'password'} className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 font-mono text-sm text-slate-600" />
              {access.token && <button type="button" onClick={copyToken} className="rounded-xl bg-emerald-100 px-5 py-3 font-bold text-emerald-700">{copied ? 'Skopiowano!' : 'Kopiuj'}</button>}
              <button type="button" disabled={busy} onClick={changeToken} className="rounded-xl bg-blue-100 px-5 py-3 font-bold text-blue-700 disabled:opacity-50">{access.mode === 'legacy' ? 'Zabezpiecz i obróć' : 'Obróć'}</button>
              <button type="button" disabled={busy} onClick={revokeToken} className="rounded-xl bg-red-50 px-5 py-3 font-bold text-red-700 disabled:opacity-50">Unieważnij</button>
            </div>
            {access.mode === 'legacy' && <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">To starszy klucz przechowywany jawnie. Pozostaje aktywny do czasu rotacji.</p>}
            {access.mode === 'hashed' && access.token && <p className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-900">Skopiuj token teraz. Po odświeżeniu pełnego tokenu nie będzie można odzyskać.</p>}
            {access.mode === 'hashed' && !access.token && <p className="mt-3 text-sm text-slate-500">Pełny token nie jest przechowywany. W razie utraty wykonaj rotację.</p>}
          </>
        )}
      </section>

      {access.mode !== 'none' && (
        <>
          <ApiDeviceConfigurator />
          <SavingsSummaryConfigurator />
        </>
      )}

      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900">
        Po rotacji poprzedni token przestaje działać natychmiast. Limit ochronny wynosi 120 zapytań na pięć minut na ciepłą instancję.
      </div>
    </div>
  );
}
