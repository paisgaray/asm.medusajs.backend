import { Modules } from '@medusajs/framework/utils';
import { createStep, createWorkflow, StepResponse, WorkflowResponse } from '@medusajs/framework/workflows-sdk';
import { dismissRemoteLinkStep, useQueryGraphStep } from '@medusajs/medusa/core-flows';

import { BUNDLED_PRODUCT_MODULE } from '../../modules/bundled-product';
import BundledProductModuleService from '../../modules/bundled-product/service';
import { SUBSCRIPTION_MODULE } from '../../modules/subscriptions';
import { fetchItemPriceDeltaStep } from './steps/fetch-item-price-delta';
import { updateProviderSubscriptionPriceStep } from './steps/update-provider-subscription-price';
import { updateSubscriptionPriceRecordStep } from './steps/update-subscription-price-record';

export type RemoveSubscriptionItemWorkflowInput = {
  subscription_id: string;
  item_id: string;
};

type DeleteItemStepCompensation = {
  item_id: string;
  snapshot: Record<string, any>;
};

const deleteCustomItemStep = createStep(
  'delete-custom-item',
  async ({ item_id }: { item_id: string }, { container }) => {
    const bundledProductService: BundledProductModuleService = container.resolve(BUNDLED_PRODUCT_MODULE);

    const [item] = await bundledProductService.listCustomItems({ id: item_id });
    if (!item) throw new Error(`Custom item ${item_id} not found`);

    await bundledProductService.deleteCustomItems([item_id]);

    return new StepResponse({ deleted: true }, { item_id, snapshot: { ...item } } as DeleteItemStepCompensation);
  },
  async ({ item_id, snapshot }: DeleteItemStepCompensation, { container }) => {
    const bundledProductService: BundledProductModuleService = container.resolve(BUNDLED_PRODUCT_MODULE);
    await bundledProductService.createCustomItems([snapshot as any]);
  },
);

export const removeSubscriptionItemWorkflow = createWorkflow(
  'remove-subscription-item',
  ({ subscription_id, item_id }: RemoveSubscriptionItemWorkflowInput) => {
    // Compute full price delta before deleting (removes item.quantity * item.item_price)
    const pricing = fetchItemPriceDeltaStep({ subscription_id, item_id, remove_item: true });

    // Fetch linked product_id so we can dismiss the custom_item <-> product link
    const { data: itemLinks } = useQueryGraphStep({
      entity: 'custom_item',
      fields: ['id', 'product.id'],
      filters: { id: item_id },
    });

    dismissRemoteLinkStep({
      [SUBSCRIPTION_MODULE]: { subscription_id },
      [BUNDLED_PRODUCT_MODULE]: { custom_item_id: item_id },
    }).config({ name: 'dismiss-subscription-item-link' });

    dismissRemoteLinkStep({
      [BUNDLED_PRODUCT_MODULE]: { custom_item_id: item_id },
      [Modules.PRODUCT]: { product_id: itemLinks[0]?.product?.id },
    }).config({ name: 'dismiss-item-product-link' });

    deleteCustomItemStep({ item_id });

    updateProviderSubscriptionPriceStep(pricing);

    updateSubscriptionPriceRecordStep({
      subscription_id,
      new_price: pricing.new_price,
      previous_price: pricing.previous_price,
    });

    return new WorkflowResponse({ deleted: true });
  },
);
