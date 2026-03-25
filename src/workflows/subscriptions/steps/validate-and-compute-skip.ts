import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk';

import { SUBSCRIPTION_MODULE, SubscriptionFrequency } from '../../../modules/subscriptions';
import SubscriptionModuleService from '../../../modules/subscriptions/service';

type ValidateAndComputeSkipStepInput = {
  subscription_id: string;
};

/**
 * Provider-agnostic step that validates a subscription can be skipped
 * and computes the new next billing date based on frequency.
 */
export const validateAndComputeSkipStep = createStep(
  'validate-and-compute-skip',
  async (input: ValidateAndComputeSkipStepInput, { container }) => {
    const subscriptionService: SubscriptionModuleService = container.resolve(SUBSCRIPTION_MODULE);

    const subscription = await subscriptionService.retrieveSubscription(input.subscription_id);

    if (subscription.status !== 'active') {
      throw new Error(
        `Cannot skip a subscription with status "${subscription.status}". Only active subscriptions can be skipped.`,
      );
    }

    if (!subscription.next_billing_date) {
      throw new Error('Subscription has no next_billing_date set');
    }

    // Compute new next billing date based on frequency
    const currentDate = new Date(subscription.next_billing_date);
    const newDate = new Date(currentDate);

    switch (subscription.frequency) {
      case SubscriptionFrequency.WEEKLY:
        newDate.setDate(newDate.getDate() + 7);
        break;
      case SubscriptionFrequency.BIWEEKLY:
        newDate.setDate(newDate.getDate() + 14);
        break;
      case SubscriptionFrequency.MONTHLY:
      default:
        newDate.setMonth(newDate.getMonth() + 1);
        break;
    }

    return new StepResponse({
      provider: subscription.provider,
      provider_subscription_id: subscription.provider_subscription_id,
      new_next_billing_date: newDate,
      previous_next_billing_date: currentDate,
    });
  },
);
