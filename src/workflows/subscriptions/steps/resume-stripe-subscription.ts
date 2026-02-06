import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk';
import Stripe from 'stripe';

import SubscriptionModuleService from '../../../modules/subscriptions/service';

type ResumeStripeSubscriptionStepInput = {
  subscription_id: string;
};

export const resumeStripeSubscriptionStep = createStep(
  'resume-stripe-subscription',
  async (input: ResumeStripeSubscriptionStepInput, { container }) => {
    const subscriptionService = container.resolve('subscriptions') as SubscriptionModuleService;

    const subscription = await subscriptionService.retrieveSubscription(input.subscription_id);

    if (subscription.provider !== 'stripe') {
      throw new Error('This step only supports Stripe subscriptions');
    }

    const stripe = new Stripe(process.env.STRIPE_API_KEY!, { apiVersion: '2022-11-15' });

    // Resume the subscription
    await stripe.subscriptions.update(subscription.provider_subscription_id, {
      pause_collection: null,
    });

    return new StepResponse(
      {
        status: 'active',
        resumed_at: new Date(),
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

    // Rollback: pause the subscription again
    const stripe = new Stripe(process.env.STRIPE_API_KEY!, { apiVersion: '2022-11-15' });

    try {
      await stripe.subscriptions.update(data.provider_subscription_id, {
        pause_collection: {
          behavior: 'void',
        },
      });
      container.resolve('logger').info(`Rolled back resume for subscription: ${data.provider_subscription_id}`);
    } catch (error: any) {
      container.resolve('logger').error(`Failed to rollback resume: ${error.message}`);
    }
  },
);
