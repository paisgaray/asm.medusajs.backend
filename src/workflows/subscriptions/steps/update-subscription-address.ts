import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk';

import { SUBSCRIPTION_MODULE } from '../../../modules/subscriptions';
import SubscriptionModuleService from '../../../modules/subscriptions/service';

type UpdateSubscriptionAddressStepInput = {
  id: string;
  first_name: string;
  last_name: string;
  address_1: string;
  address_2: string;
  city: string;
  country_code: string;
  province: string;
  postal_code: string;
};

export const updateSubscriptionAddressStep = createStep(
  'update-subscription-address',
  async ({ id, ...input }: UpdateSubscriptionAddressStepInput, { container }) => {
    const subscriptionService: SubscriptionModuleService = container.resolve(SUBSCRIPTION_MODULE);

    const subscription = await subscriptionService.retrieveSubscription(id);

    const subscriptionAddress = await subscriptionService.updateSubscriptionAddresses({
      id: subscription.address_id,
      ...input,
    });

    return new StepResponse({ subscriptionAddress });
  },
);
