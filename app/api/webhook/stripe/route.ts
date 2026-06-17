import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { pool } from '../../../../lib/db';

export const dynamic = 'force-dynamic';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16'
});

function isEntitled(status: Stripe.Subscription.Status): boolean {
  return status === 'active' || status === 'trialing';
}

async function updateSubscriptionState(subscription: Stripe.Subscription) {
  await pool.query(
    `UPDATE user_subscriptions
     SET is_active = $2,
         current_period_end = $3
     WHERE stripe_subscription_id = $1`,
    [subscription.id, isEntitled(subscription.status), new Date(subscription.current_period_end * 1000)]
  );
}

export async function POST(req: Request) {
  const payload = await req.text();
  const signature = req.headers.get('stripe-signature');

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      payload,
      signature || '',
      process.env.STRIPE_WEBHOOK_SECRET || ''
    );
  } catch (error: any) {
    console.error('Stripe webhook signature error:', error.message);
    return NextResponse.json({ error: 'Nieprawidłowy podpis webhooka.' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;
        const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id;
        const subscriptionId = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id;

        if (!userId || !subscriptionId) break;

        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        await pool.query(
          `INSERT INTO user_subscriptions
             (user_id, stripe_customer_id, stripe_subscription_id, plan_type, is_active, current_period_end)
           VALUES ($1, $2, $3, 'pro', $4, $5)
           ON CONFLICT (user_id) DO UPDATE
           SET stripe_customer_id = EXCLUDED.stripe_customer_id,
               stripe_subscription_id = EXCLUDED.stripe_subscription_id,
               plan_type = 'pro',
               is_active = EXCLUDED.is_active,
               current_period_end = EXCLUDED.current_period_end`,
          [
            userId,
            customerId || null,
            subscriptionId,
            isEntitled(subscription.status),
            new Date(subscription.current_period_end * 1000)
          ]
        );
        break;
      }

      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await updateSubscriptionState(subscription);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = typeof invoice.subscription === 'string'
          ? invoice.subscription
          : invoice.subscription?.id;

        if (subscriptionId) {
          await pool.query(
            'UPDATE user_subscriptions SET is_active = false WHERE stripe_subscription_id = $1',
            [subscriptionId]
          );
        }
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = typeof invoice.subscription === 'string'
          ? invoice.subscription
          : invoice.subscription?.id;

        if (subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          await updateSubscriptionState(subscription);
        }
        break;
      }

      default:
        break;
    }
  } catch (error) {
    console.error(`Stripe webhook processing error (${event.type}):`, error);
    return NextResponse.json({ error: 'Nie udało się przetworzyć webhooka.' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
