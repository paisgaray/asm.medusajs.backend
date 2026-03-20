import {
  createStep,
  createWorkflow,
  StepResponse,
  transform,
  WorkflowResponse,
} from '@medusajs/framework/workflows-sdk';

import { BUNDLED_PRODUCT_MODULE } from '../../modules/bundled-product';
import BundledProductModuleService from '../../modules/bundled-product/service';
import { fetchItemPriceDeltaStep } from './steps/fetch-item-price-delta';
import { updateProviderSubscriptionPriceStep } from './steps/update-provider-subscription-price';
import { updateSubscriptionPriceRecordStep } from './steps/update-subscription-price-record';

export type UpdateSubscriptionItemQuantityWorkflowInput = {
  subscription_id: string;
  item_id: string;
  quantity: number;
};

type UpdateItemStepInput = { item_id: string; quantity: number };
type UpdateItemStepCompensation = { item_id: string; previous_quantity: number };

const updateItemQuantityStep = createStep(
  'update-item-quantity',
  async ({ item_id, quantity }: UpdateItemStepInput, { container }) => {
    const bundledProductService: BundledProductModuleService = container.resolve(BUNDLED_PRODUCT_MODULE);

    const [before] = await bundledProductService.listCustomItems({ id: item_id });
    if (!before) throw new Error(`Custom item ${item_id} not found`);

    await bundledProductService.updateCustomItems([{ id: item_id, quantity }]);

    return new StepResponse({ previous_quantity: before.quantity, new_quantity: quantity }, {
      item_id,
      previous_quantity: before.quantity,
    } as UpdateItemStepCompensation);
  },
  async ({ item_id, previous_quantity }: UpdateItemStepCompensation, { container }) => {
    const bundledProductService: BundledProductModuleService = container.resolve(BUNDLED_PRODUCT_MODULE);
    await bundledProductService.updateCustomItems([{ id: item_id, quantity: previous_quantity }]);
  },
);

export const updateSubscriptionItemQuantityWorkflow = createWorkflow(
  'update-subscription-item-quantity',
  ({ subscription_id, item_id, quantity }: UpdateSubscriptionItemQuantityWorkflowInput) => {
    const quantityChange = updateItemQuantityStep({ item_id, quantity });

    const pricingInput = transform({ quantityChange, subscription_id, item_id }, (data) => ({
      subscription_id: data.subscription_id,
      item_id: data.item_id,
      quantity_delta: data.quantityChange.new_quantity - data.quantityChange.previous_quantity,
    }));

    const pricing = fetchItemPriceDeltaStep(pricingInput);

    updateProviderSubscriptionPriceStep(pricing);

    updateSubscriptionPriceRecordStep({
      subscription_id,
      new_price: pricing.new_price,
      previous_price: pricing.previous_price,
    });

    return new WorkflowResponse({ item_id, quantity });
  },
);
