import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import crypto from 'crypto'; // Dodajemy do generowania unikalnego API Key
// @ts-ignore - ignorujemy brak typów dla biblioteki pg
import { Pool } from 'pg';

// Zabezpieczenie przed cache'owaniem (webhooki muszą być przetwarzane na bieżąco)
export const dynamic = 'force-dynamic';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16',
});

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

export async function POST(req: Request) {
  // W Next.js App Router pobieramy surowy tekst (raw body) wymagany przez Stripe do weryfikacji podpisów
  const payload = await req.text();
  const signature = req.headers.get('Stripe-Signature');

  let event: Stripe.Event;

  try {
    // Weryfikujemy, czy to zapytanie na pewno przyszło od prawdziwego serwera Stripe
    event = stripe.webhooks.constructEvent(
      payload,
      signature || '',
      process.env.STRIPE_WEBHOOK_SECRET || ''
    );
  } catch (err: any) {
    console.error('Błąd weryfikacji podpisu Webhooka:', err.message);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  // --- ZDARZENIE 1: ZAKOŃCZONO PŁATNOŚĆ (SUKCES) ---
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    
    // Wyciągamy ID użytkownika, które przekazaliśmy w page.tsx podczas tworzenia sesji
    const userId = session.metadata?.userId;
    const customerId = session.customer as string;
    const subscriptionId = session.subscription as string;

    if (userId && subscriptionId) {
      try {
        // Pobieramy detale subskrypcji ze Stripe, żeby znać jej datę ważności
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const currentPeriodEnd = new Date(subscription.current_period_end * 1000);

        // Generujemy unikalny klucz API dla nowego klienta (format: eo_live_ + 32 losowe znaki hex)
        const generatedApiKey = 'eo_live_' + crypto.randomBytes(16).toString('hex');

        // Zapisujemy lub aktualizujemy status w naszej bazie Neon (PostgreSQL)
        await pool.query(`
          INSERT INTO user_subscriptions (user_id, stripe_customer_id, stripe_subscription_id, plan_type, is_active, current_period_end, api_key)
          VALUES ($1, $2, $3, 'pro', true, $4, $5)
          ON CONFLICT (user_id) DO UPDATE 
          SET stripe_customer_id = EXCLUDED.stripe_customer_id,
              stripe_subscription_id = EXCLUDED.stripe_subscription_id,
              plan_type = 'pro',
              is_active = true,
              current_period_end = EXCLUDED.current_period_end,
              -- COALESCE dba o to, by nie nadpisać klucza API, jeśli użytkownik już go wcześniej miał (np. przy odnowieniu subskrypcji)
              api_key = COALESCE(user_subscriptions.api_key, EXCLUDED.api_key)
        `, [userId, customerId, subscriptionId, currentPeriodEnd, generatedApiKey]);

        console.log(`[SUCCESS] Aktywowano PRO dla użytkownika: ${userId}. Wygenerowano/zachowano API KEY.`);
      } catch (dbError) {
        console.error('[ERROR] Błąd zapisu do bazy danych:', dbError);
        return NextResponse.json({ error: 'Database error' }, { status: 500 });
      }
    }
  }

  // --- ZDARZENIE 2: ANULOWANIE SUBSKRYPCJI ---
  if (event.type === 'customer.subscription.deleted') {
     const subscription = event.data.object as Stripe.Subscription;
     
     try {
         // Wyłączamy PRO w bazie, gdy subskrypcja wygaśnie lub zostanie anulowana w Stripe.
         // Celowo NIE usuwamy api_key, żeby móc je ponownie aktywować przy powrocie klienta.
         await pool.query(
             'UPDATE user_subscriptions SET is_active = false WHERE stripe_subscription_id = $1',
             [subscription.id]
         );
         console.log(`[INFO] Subskrypcja anulowana: ${subscription.id}`);
     } catch(e) {
         console.error('[ERROR] Błąd aktualizacji bazy przy anulowaniu:', e);
     }
  }

  // Zwracamy HTTP 200, aby Stripe wiedział, że wszystko przetworzyliśmy bez problemów
  return NextResponse.json({ received: true }, { status: 200 });
}
