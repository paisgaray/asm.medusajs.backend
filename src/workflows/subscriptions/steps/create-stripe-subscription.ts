import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk';
import Stripe from 'stripe';

type CreateStripeSubscriptionStepInput = {
  stripe_customer_id: string;
  stripe_product_id: string;
  subscription_price: number;
  currency: string;
  /** When true, first payment was already handled by checkout. Subscription starts billing next month. */
  skip_first_charge?: boolean;
};

export const createStripeSubscriptionStep = createStep(
  'create-stripe-subscription',
  async (input: CreateStripeSubscriptionStepInput, { container: _container }) => {
    const stripe = new Stripe(process.env.STRIPE_API_KEY!);

    // Create Stripe subscription
    const subscriptionParams: Stripe.SubscriptionCreateParams = {
      customer: input.stripe_customer_id,
      items: [
        {
          price_data: {
            currency: input.currency,
            product: input.stripe_product_id,
            unit_amount: Math.round(input.subscription_price * 100), // Convert to cents
            recurring: {
              interval: 'month',
            },
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
      const now = Math.floor(Date.now() / 1000);
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

    return new StepResponse(
      {
        stripe_subscription_id: stripeSubscription.id,
        stripe_customer_id: input.stripe_customer_id,
        status: stripeSubscription.status,
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
