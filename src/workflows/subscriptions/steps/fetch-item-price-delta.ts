import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk';

import { BUNDLED_PRODUCT_MODULE } from '../../../modules/bundled-product';
import BundledProductModuleService from '../../../modules/bundled-product/service';
import { SUBSCRIPTION_MODULE } from '../../../modules/subscriptions';
import SubscriptionModuleService from '../../../modules/subscriptions/service';
import { SubscriptionPricingResult } from './fetch-subscription-pricing';

type FetchItemPriceDeltaStepInput = {
  subscription_id: string;
  item_id: string;
  /** Signed quantity delta. Ignored when remove_item is true. */
  quantity_delta?: number;
  /** When true, removes the full item quantity (price delta = -(item.quantity * item.item_price)). */
  remove_item?: boolean;
};

/**
 * Read-only step that computes how much the subscription price changes
 * when a custom item's quantity changes by `quantity_delta`.
 * Returns a SubscriptionPricingResult ready for updateProviderSubscriptionPriceStep.
 */
export const fetchItemPriceDeltaStep = createStep(
  'fetch-item-price-delta',
  async ({ subscription_id, item_id, quantity_delta, remove_item }: FetchItemPriceDeltaStepInput, { container }) => {
    const subscriptionService: SubscriptionModuleService = container.resolve(SUBSCRIPTION_MODULE);
    const bundledProductService: BundledProductModuleService = container.resolve(BUNDLED_PRODUCT_MODULE);

    const subscription = await subscriptionService.retrieveSubscription(subscription_id);
    const [item] = await bundledProductService.listCustomItems({ id: item_id });

    if (!item) throw new Error(`Custom item ${item_id} not found`);

    const delta = remove_item ? -(item.quantity ?? 1) : (quantity_delta ?? 0);
    const previousPrice = subscription.subscription_price;
    const newPrice = previousPrice + item.item_price * delta;

    return new StepResponse({
      provider: subscription.provider,
      provider_subscription_id: subscription.provider_subscription_id,
      subscription_id,
      previous_price: previousPrice,
      new_price: newPrice,
      currency: subscription.currency,
      frequency: subscription.frequency,
      item_prices: [item.item_price],
    } as SubscriptionPricingResult);
  },
);
