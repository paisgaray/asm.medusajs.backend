import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk';
import Stripe from 'stripe';

import SubscriptionModuleService from '../../../modules/subscriptions/service';

type PauseStripeSubscriptionStepInput = {
  subscription_id: string;
};

export const pauseStripeSubscriptionStep = createStep(
  'pause-stripe-subscription',
  async (input: PauseStripeSubscriptionStepInput, { container }) => {
    const subscriptionService = container.resolve('subscriptions') as SubscriptionModuleService;

    const subscription = await subscriptionService.retrieveSubscription(input.subscription_id);

    if (subscription.provider !== 'stripe') {
      throw new Error('This step only supports Stripe subscriptions');
    }

    const stripe = new Stripe(process.env.STRIPE_API_KEY!, {
      apiVersion: '2025-12-15.clover',
    });

    // Pause the subscription
    await stripe.subscriptions.update(subscription.provider_subscription_id, {
      pause_collection: {
        behavior: 'void',
      },
    });

    return new StepResponse(
      {
        status: 'paused',
        paused_at: new Date(),
      },
      {
        provider_subscription_id: subscription.provider_subscription_id,
        previous_state: subscription.status,
      },
    );
  },
  async (data, { container }) => {
    if (!data?.provider_subscription_id) {
      return;
    }

    // Rollback: resume the subscription
    const stripe = new Stripe(process.env.STRIPE_API_KEY!, {
      apiVersion: '2025-12-15.clover',
    });

    try {
      await stripe.subscriptions.update(data.provider_subscription_id, {
        pause_collection: null,
      });
      container.resolve('logger').info(`Rolled back pause for subscription: ${data.provider_subscription_id}`);
    } catch (error) {
      container.resolve('logger').error(`Failed to rollback pause: ${error.message}`);
    }
  },
);
