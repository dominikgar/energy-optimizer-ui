import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { auth } from '@clerk/nextjs/server';
// @ts-ignore
import { Pool } from 'pg';

export const dynamic = 'force-dynamic';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16',
});

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// ZMIANA: Zmieniliśmy POST na GET, ponieważ przycisk w menu Clerka działa jak zwykły link
export async function GET(req: Request) {
  try {
    // 1. Sprawdzamy kto jest zalogowany
    const { userId } = auth();

    if (!userId) {
      return NextResponse.json({ error: "Brak autoryzacji" }, { status: 401 });
    }

    // 2. Szukamy jego ID klienta Stripe (Customer ID) w naszej bazie
    const { rows } = await pool.query(
      'SELECT stripe_customer_id FROM user_subscriptions WHERE user_id = $1 AND stripe_customer_id IS NOT NULL',
      [userId]
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: "Nie znaleziono aktywnego konta rozliczeniowego. Najpierw wykup subskrypcję." }, { status: 404 });
    }

    const customerId = rows[0].stripe_customer_id;
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

    // 3. Generujemy bezpieczną sesję portalu Stripe
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${baseUrl}/?tab=api`, // Gdzie użytkownik ma wrócić po zamknięciu portalu
    });

    // 4. Przekierowujemy użytkownika
    return NextResponse.redirect(session.url, 303);

  } catch (err: any) {
    console.error("Błąd Stripe Customer Portal:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
