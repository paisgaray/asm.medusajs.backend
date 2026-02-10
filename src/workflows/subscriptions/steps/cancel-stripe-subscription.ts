import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk';
import Stripe from 'stripe';

import SubscriptionModuleService from '../../../modules/subscriptions/service';

type CancelStripeSubscriptionStepInput = {
  subscription_id: string;
};

export const cancelStripeSubscriptionStep = createStep(
  'cancel-stripe-subscription',
  async (input: CancelStripeSubscriptionStepInput, { container }) => {
    const subscriptionService = container.resolve('subscriptions') as SubscriptionModuleService;

    const subscription = await subscriptionService.retrieveSubscription(input.subscription_id);

    if (subscription.provider !== 'stripe') {
      throw new Error('This step only supports Stripe subscriptions');
    }

    const stripe = new Stripe(process.env.STRIPE_API_KEY!);

    // Cancel the subscription immediately
    const canceledSubscription = await stripe.subscriptions.cancel(subscription.provider_subscription_id);

    return new StepResponse({
      status: 'cancelled',
      cancelled_at: new Date(canceledSubscription.canceled_at! * 1000),
    });
  },
  // No compensation as cancellation is typically final
);
