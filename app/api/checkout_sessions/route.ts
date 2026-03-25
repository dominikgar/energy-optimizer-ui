import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { auth } from '@clerk/nextjs/server';

// Inicjalizacja Stripe z tajnym kluczem
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16', // Używamy stabilnej wersji API
});

export async function POST(req: Request) {
  try {
    // 1. Sprawdzamy czy użytkownik jest zalogowany (Clerk)
    const { userId } = auth();

    if (!userId) {
      return NextResponse.json({ error: "Musisz być zalogowany, aby dokonać zakupu." }, { status: 401 });
    }

    // 2. Pobieramy adres URL aplikacji (żeby Stripe wiedział gdzie wrócić)
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

    // 3. Tworzymy sesję zakupową Stripe (Checkout Session)
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card', 'blik', 'p24'], // Dodajemy polskie metody płatności!
      line_items: [
        {
          price_data: {
            currency: 'pln',
            product_data: {
              name: 'Energy Optimizer PRO (Subskrypcja)',
              description: 'Dostęp do radaru oszczędności na żywo i integracji API dla Home Assistanta.',
            },
            unit_amount: 1499, // Cena w groszach! 1499 = 14.99 PLN
            recurring: {
              interval: 'month', // Ustawiamy odnawianie co miesiąc
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        userId: userId, // BARDZO WAŻNE: Podpinamy ID z Clerka, aby webhook wiedział, kto zapłacił
      },
      mode: 'subscription', // Tryb subskrypcji
      success_url: `${baseUrl}/?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/?canceled=true`,
    });

    // 4. Przekierowujemy użytkownika na bezpieczną stronę Stripe
    if (session.url) {
      return NextResponse.redirect(session.url, 303);
    } else {
      return NextResponse.json({ error: "Błąd podczas generowania linku do płatności." }, { status: 500 });
    }
  } catch (err: any) {
    console.error("Błąd Stripe Checkout:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
