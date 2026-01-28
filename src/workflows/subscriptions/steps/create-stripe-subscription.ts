import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk';
import Stripe from 'stripe';

type CreateStripeSubscriptionStepInput = {
  customer_id: string;
  bundle_product_id: string;
  subscription_price: number;
  currency: string;
  one_time_items?: Array<{
    price_data: {
      currency: string;
      product: string;
      unit_amount: number;
    };
    quantity: number;
  }>;
};

export const createStripeSubscriptionStep = createStep(
  'create-stripe-subscription',
  async (input: CreateStripeSubscriptionStepInput, { container }) => {
    const stripe = new Stripe(process.env.STRIPE_API_KEY!, {
      apiVersion: '2025-12-15.clover',
    });

    // Get or create Stripe customer
    const customerQuery = container.resolve('query');
    const {
      data: [customer],
    } = await customerQuery.graph({
      entity: 'customer',
      filters: { id: input.customer_id },
      fields: ['email', 'metadata'],
    });

    let stripeCustomerId = customer?.metadata?.stripe_customer_id;

    if (!stripeCustomerId) {
      const stripeCustomer = await stripe.customers.create({
        email: customer.email,
        metadata: {
          medusa_customer_id: input.customer_id,
        },
      });
      stripeCustomerId = stripeCustomer.id;

      // Update customer metadata
      const customerService = container.resolve('customer') as any;
      await customerService.updateCustomers(
        [
          {
            id: input.customer_id,
            metadata: {
              ...customer.metadata,
              stripe_customer_id: stripeCustomerId,
            },
          },
        ],
        {},
      );
    }

    // Create Stripe subscription
    const subscriptionParams: Stripe.SubscriptionCreateParams = {
      customer: stripeCustomerId,
      items: [
        {
          price_data: {
            currency: input.currency,
            product: input.bundle_product_id,
            unit_amount: Math.round(input.subscription_price * 100), // Convert to cents
            recurring: {
              interval: 'month',
            },
          },
        },
      ],
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent'],
    };

    // Add one-time items to the first invoice
    if (input.one_time_items && input.one_time_items.length > 0) {
      subscriptionParams.add_invoice_items = input.one_time_items;
    }

    const stripeSubscription = await stripe.subscriptions.create(subscriptionParams);

    // Extract client secret
    let clientSecret: string | null = null;
    if (stripeSubscription.latest_invoice) {
      const invoice: any =
        typeof stripeSubscription.latest_invoice === 'string'
          ? await stripe.invoices.retrieve(stripeSubscription.latest_invoice, { expand: ['payment_intent'] })
          : stripeSubscription.latest_invoice;

      if (invoice.payment_intent && typeof invoice.payment_intent !== 'string') {
        clientSecret = invoice.payment_intent.client_secret || null;
      }
    }

    return new StepResponse(
      {
        stripe_subscription_id: stripeSubscription.id,
        stripe_customer_id: stripeCustomerId,
        current_period_start: new Date(stripeSubscription.current_period_start * 1000),
        current_period_end: new Date(stripeSubscription.current_period_end * 1000),
        next_billing_date: new Date(stripeSubscription.current_period_end * 1000),
        status: stripeSubscription.status,
        client_secret: clientSecret,
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
    const stripe = new Stripe(process.env.STRIPE_API_KEY!, {
      apiVersion: '2025-12-15.clover',
    });

    try {
      await stripe.subscriptions.cancel(data.stripe_subscription_id);
      container.resolve('logger').info(`Rolled back Stripe subscription: ${data.stripe_subscription_id}`);
    } catch (error) {
      container.resolve('logger').error(`Failed to rollback Stripe subscription: ${error.message}`);
    }
  },
);
