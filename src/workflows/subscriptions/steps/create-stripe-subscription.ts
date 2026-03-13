import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk';
import Stripe from 'stripe';

type CreateStripeSubscriptionStepInput = {
  stripe_customer_id: string;
  stripe_product_id: string;
  subscription_price: number;
  currency: string;
  /** When true, first payment was already handled by checkout. Subscription starts billing next month. */
  skip_first_charge?: boolean;
  metadata: Record<string, unknown>;
};

export const createStripeSubscriptionStep = createStep(
  'create-stripe-subscription',
  async (input: CreateStripeSubscriptionStepInput, { container: _container }) => {
    const stripe = new Stripe(process.env.STRIPE_API_KEY!);

    let recurring: Stripe.SubscriptionCreateParams.Item.PriceData.Recurring;
    switch (input.metadata?.frequency) {
      case 'weekly':
        recurring = { interval: 'week' };
        break;
      case 'biweekly':
        recurring = { interval_count: 2, interval: 'week' };
        break;
      default:
        recurring = { interval: 'month' };
    }

    // Create Stripe subscription
    const subscriptionParams: Stripe.SubscriptionCreateParams = {
      customer: input.stripe_customer_id,
      items: [
        {
          price_data: {
            currency: input.currency,
            product: input.stripe_product_id,
            unit_amount: Math.round(input.subscription_price * 100), // Convert to cents
            recurring,
          },
        },
      ],
      payment_behavior: 'error_if_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent'],
    };

    if (input.skip_first_charge) {
      // Checkout already charged for the first period.
      // Backdate the subscription start to now (in seconds), so the next billing naturally occurs ~1 month from now
      const now = Math.floor(Date.now() / 1000) - 10; // Subtract 10 seconds to ensure it's in the past and doesn't cause errors
      subscriptionParams.backdate_start_date = now;
      // The first invoice will be created but won't charge since billing already happened
      subscriptionParams.proration_behavior = 'none';
    }

    const stripeSubscription = await stripe.subscriptions.create(subscriptionParams);

    // Extract client secret
    // let clientSecret: string | null = null;
    // if (stripeSubscription.latest_invoice) {
    //   const invoice: any =
    //     typeof stripeSubscription.latest_invoice === 'string'
    //       ? await stripe.invoices.retrieve(stripeSubscription.latest_invoice, { expand: ['payment_intent'] })
    //       : stripeSubscription.latest_invoice;

    //   if (invoice.payment_intent && typeof invoice.payment_intent !== 'string') {
    //     clientSecret = invoice.payment_intent.client_secret || null;
    //   }
    // }

    // console.log('clientSecret', clientSecret);

    // In Stripe API 2026-01-28.clover+, current_period_start/end moved from
    // the subscription root to each subscription item.
    const firstItem = stripeSubscription.items.data[0];
    const periodStart = firstItem?.current_period_start;
    const periodEnd = firstItem?.current_period_end;

    return new StepResponse(
      {
        stripe_subscription_id: stripeSubscription.id,
        stripe_customer_id: input.stripe_customer_id,
        status: stripeSubscription.status,
        current_period_start: periodStart ? new Date(periodStart * 1000) : undefined,
        next_billing_date: periodEnd ? new Date(periodEnd * 1000) : undefined,
        // client_secret: clientSecret,
      },
      {
        stripe_subscription_id: stripeSubscription.id,
      },
    );
  },
  async (data, { container }) => {
    if (!data?.stripe_subscription_id) {
      return;
    }

    // Rollback: cancel the Stripe subscription if something fails later
    const stripe = new Stripe(process.env.STRIPE_API_KEY!);

    try {
      await stripe.subscriptions.cancel(data.stripe_subscription_id);
      container.resolve('logger').info(`Rolled back Stripe subscription: ${data.stripe_subscription_id}`);
    } catch (error: any) {
      container.resolve('logger').error(`Failed to rollback Stripe subscription: ${error.message}`);
    }
  },
);
