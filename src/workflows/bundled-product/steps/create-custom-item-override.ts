import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk';

import { BUNDLED_PRODUCT_MODULE } from '../../../modules/bundled-product';
import BundledProductModuleService from '../../../modules/bundled-product/service';

type CreateBundleItemOverrideStepInput = {
  customBundle_id: string;
  next_billing_date: Date;
  item: {
    bundleItemId: string;
    product_id: string;
  };
};

export const createCustomBundleItemOverrideStep = createStep(
  'create-custom-bundle-item-override',
  async ({ customBundle_id, next_billing_date, item }: CreateBundleItemOverrideStepInput, { container }) => {
    const bundledProductModuleService: BundledProductModuleService = container.resolve(BUNDLED_PRODUCT_MODULE);

    const customBundleItemOverride = await bundledProductModuleService.createCustomItemOverrides([
      { customBundle_id, customItem_id: item.bundleItemId, delivery_date: next_billing_date },
    ]);

    return new StepResponse(
      customBundleItemOverride,
      customBundleItemOverride.map((item) => item.id),
    );
  },
  async (itemIds, { container }) => {
    if (!itemIds?.length) return;

    const bundledProductModuleService: BundledProductModuleService = container.resolve(BUNDLED_PRODUCT_MODULE);

    await bundledProductModuleService.deleteCustomItemOverrides(itemIds);
  },
);
