import { OrderDTO } from '@medusajs/framework/types';
import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk';

import { SUBSCRIPTION_MODULE } from '../../../modules/subscriptions';
import SubscriptionModuleService from '../../../modules/subscriptions/service';

type CreateSubscriptionAddressStepInput = {
  order: OrderDTO;
};

export const createSubscriptionAddressStep = createStep(
  'create-subscription-address',
  async (input: CreateSubscriptionAddressStepInput, { container }) => {
    const subscriptionService: SubscriptionModuleService = container.resolve(SUBSCRIPTION_MODULE);

    const subscriptionAddress = await subscriptionService.createSubscriptionAddresses(input.order.shipping_address);

    return new StepResponse({ subscriptionAddress }, { subscription_address_id: subscriptionAddress.id });
  },
  async (data, { container }) => {
    if (!data?.subscription_address_id) return;

    const subscriptionService: SubscriptionModuleService = container.resolve(SUBSCRIPTION_MODULE);
    await subscriptionService.deleteSubscriptionAddresses([data.subscription_address_id]);
  },
);
