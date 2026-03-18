import { Modules } from '@medusajs/framework/utils';
import { createWorkflow, transform, WorkflowResponse } from '@medusajs/framework/workflows-sdk';
import { createRemoteLinkStep } from '@medusajs/medusa/core-flows';

import { BUNDLED_PRODUCT_MODULE } from '../../modules/bundled-product';
import { SUBSCRIPTION_MODULE } from '../../modules/subscriptions';
import { createStandaloneCustomItemStep } from '../bundled-product/steps/create-standalone-custom-item';
import { fetchSubscriptionPricingStep } from './steps/fetch-subscription-pricing';
import { updateProviderSubscriptionPriceStep } from './steps/update-provider-subscription-price';
import { updateSubscriptionPriceRecordStep } from './steps/update-subscription-price-record';

export type AddItemToSubscriptionWorkflowInput = {
  subscription_id: string;
  product_id: string;
};

export const addItemToSubscriptionWorkflow = createWorkflow(
  'add-item-to-subscription',
  ({ subscription_id, product_id }: AddItemToSubscriptionWorkflowInput) => {
    const pricing = fetchSubscriptionPricingStep({ subscription_id, product_id });

    const customItem = createStandaloneCustomItemStep({ product_id });

    const links = transform({ customItem, subscription_id, product_id }, (data) => [
      {
        [BUNDLED_PRODUCT_MODULE]: { custom_item_id: data.customItem.id },
        [Modules.PRODUCT]: { product_id: data.product_id },
      },
      {
        [SUBSCRIPTION_MODULE]: { subscription_id: data.subscription_id },
        [BUNDLED_PRODUCT_MODULE]: { custom_item_id: data.customItem.id },
      },
    ]);

    createRemoteLinkStep(links).config({ name: 'add-subscription-item-links' });

    updateProviderSubscriptionPriceStep(pricing);

    updateSubscriptionPriceRecordStep({
      subscription_id,
      new_price: pricing.new_price,
      previous_price: pricing.previous_price,
    });

    return new WorkflowResponse(customItem);
  },
);
