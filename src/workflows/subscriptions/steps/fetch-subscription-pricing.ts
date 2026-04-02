import { ContainerRegistrationKeys } from '@medusajs/framework/utils';
import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk';

import { SUBSCRIPTION_MODULE, SubscriptionProvider } from '../../../modules/subscriptions';
import SubscriptionModuleService from '../../../modules/subscriptions/service';
import { resolveSubscriptionPrice } from '../../../utils/resolve-subscription-price';

type FetchSubscriptionPricingStepInput = {
  subscription_id: string;
  items: { product_id: string; quantity: number }[];
};

export type SubscriptionPricingResult = {
  provider_id: SubscriptionProvider;
  provider_subscription_id: string;
  subscription_id: string;
  previous_price: number;
  new_price: number;
  currency: string;
  frequency: string;
  item_prices: number[];
};

export const fetchSubscriptionPricingStep = createStep(
  'fetch-subscription-pricing',
  async ({ subscription_id, items }: FetchSubscriptionPricingStepInput, { container }) => {
    const query = container.resolve(ContainerRegistrationKeys.QUERY);
    const subscriptionService: SubscriptionModuleService = container.resolve(SUBSCRIPTION_MODULE);

    const subscription = await subscriptionService.retrieveSubscription(subscription_id);
    const currency = subscription.currency;

    const productIds = items.map((item) => item.product_id);

    const { data: products } = await query.graph({
      entity: 'product',
      filters: { id: productIds },
      fields: ['id', 'variants.*', 'variants.prices.*', 'variants.options.*', 'variants.options.option.*'],
    });

    const productMap = new Map((products as any[]).map((p) => [p.id, p]));

    let addedPrice = 0;
    const itemPrices: number[] = [];

    for (const item of items) {
      const product = productMap.get(item.product_id);

      if (!product) {
        throw new Error(`Product ${item.product_id} not found`);
      }

      const variants = (product.variants as any[]) ?? [];
      const itemPrice = resolveSubscriptionPrice(variants, currency);

      if (!itemPrice) {
        throw new Error(`No price found for product ${item.product_id} in currency ${currency}`);
      }

      addedPrice += itemPrice * item.quantity;
      itemPrices.push(itemPrice);
    }

    const previousPrice = subscription.subscription_price;
    const newPrice = previousPrice + addedPrice;

    return new StepResponse({
      provider_id: subscription.provider_id,
      provider_subscription_id: subscription.provider_subscription_id,
      subscription_id,
      previous_price: previousPrice,
      new_price: newPrice,
      currency,
      frequency: subscription.frequency,
      item_prices: itemPrices,
    } as SubscriptionPricingResult);
  },
);
