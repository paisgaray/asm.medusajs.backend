import { ContainerRegistrationKeys } from '@medusajs/framework/utils';
import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk';

import { SUBSCRIPTION_MODULE } from '../../../modules/subscriptions';
import SubscriptionModuleService from '../../../modules/subscriptions/service';

type FetchSubscriptionPricingStepInput = {
  subscription_id: string;
  product_id: string;
  quantity: number;
};

export type SubscriptionPricingResult = {
  provider: string;
  provider_subscription_id: string;
  subscription_id: string;
  previous_price: number;
  new_price: number;
  currency: string;
  frequency: string;
};

export const fetchSubscriptionPricingStep = createStep(
  'fetch-subscription-pricing',
  async ({ subscription_id, product_id, quantity }: FetchSubscriptionPricingStepInput, { container }) => {
    const query = container.resolve(ContainerRegistrationKeys.QUERY);
    const subscriptionService: SubscriptionModuleService = container.resolve(SUBSCRIPTION_MODULE);

    const subscription = await subscriptionService.retrieveSubscription(subscription_id);

    const {
      data: [product],
    } = await query.graph({
      entity: 'product',
      filters: { id: product_id },
      fields: ['id', 'variants.*', 'variants.prices.*', 'variants.options.*'],
    });

    if (!product) {
      throw new Error(`Product ${product_id} not found`);
    }

    const currency = subscription.currency;
    const variant = product.variants?.[0];

    // Prefer price with as: 'subscription' rule, fall back to first match
    const matchingPrices = variant?.prices?.filter((p: any) => p.currency_code === currency) ?? [];
    const price =
      matchingPrices.find((p: any) => p.rules?.as === 'subscription') ?? matchingPrices[0] ?? variant?.prices?.[0];

    if (!price?.amount) {
      throw new Error(`No price found for product ${product_id} in currency ${currency}`);
    }

    const previousPrice = subscription.subscription_price;
    const newPrice = previousPrice + price.amount * quantity;

    return new StepResponse({
      provider: subscription.provider,
      provider_subscription_id: subscription.provider_subscription_id,
      subscription_id,
      previous_price: previousPrice,
      new_price: newPrice,
      currency,
      frequency: subscription.frequency,
    } as SubscriptionPricingResult);
  },
);
