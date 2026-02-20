import { Modules } from '@medusajs/framework/utils';
import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk';

import { SUBSCRIPTION_MODULE } from '../../../modules/subscriptions';

type CreateSubscriptionCustomerLinkInput = {
  subscription_id: string;
  customer_id: string;
};

export const createSubscriptionCustomerLinkStep = createStep(
  'create-subscription-customer-link',
  async (input: CreateSubscriptionCustomerLinkInput, { container }) => {
    const remoteLink = container.resolve('remoteLink');

    await remoteLink.create({
      [SUBSCRIPTION_MODULE]: {
        subscription_id: input.subscription_id,
      },
      [Modules.CUSTOMER]: {
        customer_id: input.customer_id,
      },
    });

    return new StepResponse(
      { subscription_id: input.subscription_id, customer_id: input.customer_id },
      { subscription_id: input.subscription_id, customer_id: input.customer_id },
    );
  },
  async (data, { container }) => {
    if (!data) return;

    const remoteLink = container.resolve('remoteLink');

    await remoteLink.dismiss({
      [SUBSCRIPTION_MODULE]: {
        subscription_id: data.subscription_id,
      },
      [Modules.CUSTOMER]: {
        customer_id: data.customer_id,
      },
    });
  },
);
