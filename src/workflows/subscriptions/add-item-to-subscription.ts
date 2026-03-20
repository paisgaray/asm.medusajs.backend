import { Modules } from '@medusajs/framework/utils';
import { createWorkflow, transform, WorkflowResponse } from '@medusajs/framework/workflows-sdk';
import { createRemoteLinkStep } from '@medusajs/medusa/core-flows';

import { BUNDLED_PRODUCT_MODULE } from '../../modules/bundled-product';
import { SUBSCRIPTION_MODULE } from '../../modules/subscriptions';
import { createStandaloneCustomItemsStep } from '../bundled-product/steps/create-standalone-custom-item';
import { fetchSubscriptionPricingStep } from './steps/fetch-subscription-pricing';
import { updateProviderSubscriptionPriceStep } from './steps/update-provider-subscription-price';
import { updateSubscriptionPriceRecordStep } from './steps/update-subscription-price-record';

export type AddItemToSubscriptionWorkflowInput = {
  subscription_id: string;
  items: { product_id: string; quantity: number }[];
};

export const addItemToSubscriptionWorkflow = createWorkflow(
  'add-item-to-subscription',
  ({ subscription_id, items }: AddItemToSubscriptionWorkflowInput) => {
    const pricing = fetchSubscriptionPricingStep({ subscription_id, items });

    const itemsWithPrices = transform({ items, pricing }, (data) =>
      data.items.map((item, index) => ({
        ...item,
        item_price: data.pricing.item_prices[index] ?? 0,
      })),
    );

    const customItems = createStandaloneCustomItemsStep({ items: itemsWithPrices });

    const links = transform({ customItems, subscription_id, items }, (data) =>
      data.customItems.flatMap((customItem, index) => [
        {
          [BUNDLED_PRODUCT_MODULE]: { custom_item_id: customItem.id },
          [Modules.PRODUCT]: { product_id: data.items[index].product_id },
        },
        {
          [SUBSCRIPTION_MODULE]: { subscription_id: data.subscription_id },
          [BUNDLED_PRODUCT_MODULE]: { custom_item_id: customItem.id },
        },
      ]),
    );

    createRemoteLinkStep(links).config({ name: 'add-subscription-item-links' });

    updateProviderSubscriptionPriceStep(pricing);

    updateSubscriptionPriceRecordStep({
      subscription_id,
      new_price: pricing.new_price,
      previous_price: pricing.previous_price,
    });

    return new WorkflowResponse(customItems);
  },
);
