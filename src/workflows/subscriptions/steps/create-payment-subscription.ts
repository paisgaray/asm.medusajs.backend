import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk';
import Stripe from 'stripe';

import { getProviderAdapter } from '../../../modules/subscriptions/adapters';
import { CreatePaymentSubscriptionStepInput } from '../../../modules/subscriptions/adapters/type';

export const createPaymentSubscriptionStep = createStep(
  'create-payment-subscription',
  async (input: CreatePaymentSubscriptionStepInput, { container: _container }) => {
    const adapter = getProviderAdapter(input.payment_provider_id);

    const { subscription, periodStart, periodEnd } = await adapter.createPaymentSubscription(input);

    return new StepResponse(
      {
        payment_subscription_id: subscription.id,
        payment_customer_id: input.payment_customer_id,
        status: subscription.status,
        current_period_start: periodStart ? new Date(periodStart * 1000) : undefined,
        next_billing_date: periodEnd ? new Date(periodEnd * 1000) : undefined,
      },
      { payment_subscription_id: subscription.id },
    );
  },
  async (data, { container }) => {
    if (!data?.payment_subscription_id) return;

    const stripe = new Stripe(process.env.STRIPE_API_KEY!);

    try {
      await stripe.subscriptions.cancel(data.payment_subscription_id);
      container.resolve('logger').info(`Rolled back Stripe subscription: ${data.payment_subscription_id}`);
    } catch (error: any) {
      container.resolve('logger').error(`Failed to rollback Stripe subscription: ${error.message}`);
    }
  },
);
