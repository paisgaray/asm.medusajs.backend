import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk';

import { getProviderAdapter } from '../../../modules/subscriptions/adapters';
import { SubscriptionPricingResult } from './fetch-subscription-pricing';

export const updateProviderSubscriptionPriceStep = createStep(
  'update-provider-subscription-price',
  async (input: SubscriptionPricingResult, { container }) => {
    const adapter = getProviderAdapter(input.provider);

    await adapter.updatePrice(input.provider_subscription_id, input.new_price, input.currency, input.frequency);

    container
      .resolve('logger')
      .info(
        `Updated price on ${input.provider} for subscription: ${input.provider_subscription_id} — ${input.previous_price} → ${input.new_price} ${input.currency}`,
      );

    return new StepResponse(
      { updated: true },
      {
        provider: input.provider,
        provider_subscription_id: input.provider_subscription_id,
        previous_price: input.previous_price,
        currency: input.currency,
        frequency: input.frequency,
      },
    );
  },
  async (data, { container }) => {
    if (!data?.provider_subscription_id) return;

    const adapter = getProviderAdapter(data.provider);

    try {
      await adapter.rollbackUpdatePrice(
        data.provider_subscription_id,
        data.previous_price,
        data.currency,
        data.frequency,
      );
      container.resolve('logger').info(`Rolled back price update for subscription: ${data.provider_subscription_id}`);
    } catch (error: any) {
      container.resolve('logger').error(`Failed to rollback price update: ${error.message}`);
    }
  },
);
