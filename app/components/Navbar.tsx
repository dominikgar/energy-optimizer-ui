import React from 'react';
import Link from 'next/link';
import { UserButton, SignInButton, SignedIn, SignedOut } from '@clerk/nextjs';
import { auth } from '@clerk/nextjs/server';
import { pool } from '../../lib/db';

const IconZap = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500 fill-emerald-500">
    <path d="M4 14.71 13.5 3l-1.33 8.29H20l-9.5 11.71 1.33-8.29H4z"/>
  </svg>
);

export default async function Navbar() {
  const { userId } = auth();
  let isPremiumUser = false;

  // Jeśli użytkownik jest zalogowany, sprawdzamy jego status PRO w bazie
  if (userId) {
    try {
      const sub = await pool.query('SELECT is_active FROM user_subscriptions WHERE user_id = $1', [userId]);
      if (sub.rows.length > 0 && sub.rows[0].is_active) {
        isPremiumUser = true;
      }
    } catch (e) {
      console.error("Błąd pobierania statusu PRO w Navbarze:", e);
    }
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b border-emerald-950/10 bg-[#f5f7f4]/90 backdrop-blur-xl">
      <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2.5 font-black text-xl tracking-tight transition-opacity hover:opacity-75">
          <IconZap />
          <span className="bg-gradient-to-r from-emerald-600 to-blue-600 bg-clip-text text-transparent">EnergyOptimizer</span>
        </Link>
        <div className="flex items-center gap-3 rounded-full border border-emerald-950/10 bg-white px-2 py-1.5 shadow-sm">
          <SignedIn>
            {/* Plakietka PRO pojawia się tylko dla aktywnych subskrybentów */}
            {isPremiumUser && (
              <a href="/api/customer_portal" className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800 transition-colors hover:bg-emerald-200">
                PRO aktywne
              </a>
            )}
            <UserButton afterSignOutUrl="/" />
          </SignedIn>
          <SignedOut>
            <SignInButton mode="modal">
              <button className="px-3 py-1 text-sm font-bold text-slate-700 transition-colors hover:text-emerald-700">
                Zaloguj się
              </button>
            </SignInButton>
          </SignedOut>
        </div>
      </div>
    </header>
  );
}
