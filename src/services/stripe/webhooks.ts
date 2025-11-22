import Stripe from 'stripe';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
  typescript: true,
});

export async function handleWebhook(event: Stripe.Event) {
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      
      if (session.mode === 'subscription' && session.customer) {
        const customerId = typeof session.customer === 'string' 
          ? session.customer 
          : session.customer.id;

        // Find user by Stripe customer ID
        const [user] = await db.select()
          .from(users)
          .where(eq(users.stripeCustomerId, customerId));

        if (user) {
          // Update user plan to pro
          await db.update(users)
            .set({ plan: 'pro' })
            .where(eq(users.id, user.id));
        }
      }
      break;
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = typeof subscription.customer === 'string'
        ? subscription.customer
        : subscription.customer.id;

      const [user] = await db.select()
        .from(users)
        .where(eq(users.stripeCustomerId, customerId));

      if (user) {
        // Downgrade to free plan
        await db.update(users)
          .set({ plan: 'free' })
          .where(eq(users.id, user.id));
      }
      break;
    }

    default:
      console.log(`Unhandled event type: ${event.type}`);
  }
}

