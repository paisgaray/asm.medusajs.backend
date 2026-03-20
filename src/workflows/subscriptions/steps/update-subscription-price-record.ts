import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk';

import { SUBSCRIPTION_MODULE } from '../../../modules/subscriptions';
import SubscriptionModuleService from '../../../modules/subscriptions/service';

type UpdateSubscriptionPriceRecordStepInput = {
  subscription_id: string;
  new_price: number;
  previous_price: number;
};

export const updateSubscriptionPriceRecordStep = createStep(
  'update-subscription-price-record',
  async (input: UpdateSubscriptionPriceRecordStepInput, { container }) => {
    const subscriptionService: SubscriptionModuleService = container.resolve(SUBSCRIPTION_MODULE);

    await subscriptionService.updateSubscriptions([{ id: input.subscription_id, subscription_price: input.new_price }]);

    return new StepResponse(
      { updated: true },
      {
        subscription_id: input.subscription_id,
        previous_price: input.previous_price,
      },
    );
  },
  async (data, { container }) => {
    if (!data?.subscription_id) return;

    const subscriptionService: SubscriptionModuleService = container.resolve(SUBSCRIPTION_MODULE);

    await subscriptionService.updateSubscriptions([
      { id: data.subscription_id, subscription_price: data.previous_price },
    ]);
  },
);
