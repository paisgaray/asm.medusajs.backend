import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk';

import { SUBSCRIPTION_MODULE } from '../../../modules/subscriptions';
import SubscriptionModuleService from '../../../modules/subscriptions/service';

type UpdateSubscriptionNextBillingStepInput = {
  subscription_id: string;
  next_billing_date: Date;
};

export const updateSubscriptionNextBillingStep = createStep(
  'update-subscription-next-billing',
  async (input: UpdateSubscriptionNextBillingStepInput, { container }) => {
    const subscriptionService: SubscriptionModuleService = container.resolve(SUBSCRIPTION_MODULE);

    const subscription = await subscriptionService.retrieveSubscription(input.subscription_id);
    const previousNextBillingDate = subscription.next_billing_date;

    await subscriptionService.updateSubscriptions([
      {
        id: input.subscription_id,
        next_billing_date: input.next_billing_date,
      },
    ]);

    return new StepResponse(
      { updated: true },
      {
        subscription_id: input.subscription_id,
        previous_next_billing_date: previousNextBillingDate,
      },
    );
  },
  async (data, { container }) => {
    if (!data?.subscription_id || !data?.previous_next_billing_date) {
      return;
    }

    const subscriptionService: SubscriptionModuleService = container.resolve(SUBSCRIPTION_MODULE);
    await subscriptionService.updateSubscriptions([
      {
        id: data.subscription_id,
        next_billing_date: data.previous_next_billing_date,
      },
    ]);
  },
);
