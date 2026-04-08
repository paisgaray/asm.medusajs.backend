import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk';

import { SubscriptionProvider } from '../../../modules/subscriptions';
import { getProviderAdapter } from '../../../modules/subscriptions/adapters';

type SkipProviderSubscriptionStepInput = {
  provider_id: SubscriptionProvider;
  provider_subscription_id: string;
  new_next_billing_date: Date;
};

/**
 * Provider-agnostic step that delegates the skip operation
 * to the appropriate payment provider adapter.
 */
export const skipProviderSubscriptionStep = createStep(
  'skip-provider-subscription',
  async (input: SkipProviderSubscriptionStepInput, { container }) => {
    const adapter = getProviderAdapter(input.provider_id);

    await adapter.skipNextPayment(input.provider_subscription_id, new Date(input.new_next_billing_date));

    container
      .resolve('logger')
      .info(`Skipped next payment on ${input.provider_id} for subscription: ${input.provider_subscription_id}`);

    return new StepResponse(
      { skipped: true },
      {
        provider_id: input.provider_id,
        provider_subscription_id: input.provider_subscription_id,
      },
    );
  },
  async (data, { container }) => {
    if (!data?.provider_subscription_id) {
      return;
    }

    const adapter = getProviderAdapter(data.provider_id);

    try {
      await adapter.rollbackSkip(data.provider_subscription_id);
      container.resolve('logger').info(`Rolled back skip for subscription: ${data.provider_subscription_id}`);
    } catch (error: any) {
      container.resolve('logger').error(`Failed to rollback skip: ${error.message}`);
    }
  },
);
