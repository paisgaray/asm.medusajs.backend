import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk';

import { BUNDLED_PRODUCT_MODULE } from '../../../modules/bundled-product';
import BundledProductModuleService from '../../../modules/bundled-product/service';

type CreateBundleItemOverrideStepInput = {
  custom_bundle_id: string;
  custom_item_id: string;
  expire_date: Date;
};

export const createCustomBundleItemOverrideStep = createStep(
  'create-custom-bundle-item-override',
  async ({ custom_bundle_id, custom_item_id, expire_date }: CreateBundleItemOverrideStepInput, { container }) => {
    const bundledProductModuleService: BundledProductModuleService = container.resolve(BUNDLED_PRODUCT_MODULE);

    const customBundleItemOverride = await bundledProductModuleService.createCustomItemOverrides([
      { custom_bundle_id, custom_item_id, expire_date },
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
