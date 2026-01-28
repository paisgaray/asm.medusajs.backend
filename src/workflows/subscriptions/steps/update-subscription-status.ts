import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk';

import { SUBSCRIPTION_MODULE } from '../../../modules/subscriptions';
import SubscriptionModuleService from '../../../modules/subscriptions/service';

type UpdateSubscriptionStatusStepInput = {
  subscription_id: string;
  status: string;
  current_period_start?: Date;
  current_period_end?: Date;
  next_billing_date?: Date;
};

export const updateSubscriptionStatusStep = createStep(
  'update-subscription-status',
  async (input: UpdateSubscriptionStatusStepInput, { container }) => {
    const subscriptionService = container.resolve(SUBSCRIPTION_MODULE) as SubscriptionModuleService;

    const subscription = await subscriptionService.retrieveSubscription(input.subscription_id);

    const updateData: any = {
      status: input.status,
    };

    if (input.current_period_start) {
      updateData.current_period_start = input.current_period_start;
    }
    if (input.current_period_end) {
      updateData.current_period_end = input.current_period_end;
    }
    if (input.next_billing_date) {
      updateData.next_billing_date = input.next_billing_date;
    }

    await subscriptionService.updateSubscriptions([
      {
        id: input.subscription_id,
        ...updateData,
      },
    ]);

    return new StepResponse(
      { updated: true },
      {
        subscription_id: input.subscription_id,
        previous_status: subscription.status,
      },
    );
  },
  async (data, { container }) => {
    if (!data?.subscription_id || !data?.previous_status) {
      return;
    }

    // Rollback: restore previous status
    const subscriptionService = container.resolve(SUBSCRIPTION_MODULE) as SubscriptionModuleService;
    await subscriptionService.updateSubscriptions([
      {
        id: data.subscription_id,
        status: data.previous_status,
      },
    ]);
  },
);
