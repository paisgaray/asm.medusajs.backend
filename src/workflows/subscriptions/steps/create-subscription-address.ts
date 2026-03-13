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

    const address = input.order.shipping_address;

    const subscriptionAddress = await subscriptionService.createSubscriptionAddresses({
      first_name: address.first_name,
      last_name: address.last_name,
      address_1: address.address_1,
      address_2: address.address_2,
      city: address.city,
      country_code: address.country_code,
      postal_code: address.postal_code,
      metadata: address.metadata,
    });

    return new StepResponse({ subscriptionAddress }, { subscription_address_id: subscriptionAddress.id });
  },
  async (data, { container }) => {
    if (!data?.subscription_address_id) return;

    const subscriptionService: SubscriptionModuleService = container.resolve(SUBSCRIPTION_MODULE);
    await subscriptionService.deleteSubscriptionAddresses([data.subscription_address_id]);
  },
);
