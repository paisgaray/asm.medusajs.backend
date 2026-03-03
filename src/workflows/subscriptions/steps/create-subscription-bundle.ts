import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk';

import { BUNDLED_PRODUCT_MODULE } from '../../../modules/bundled-product';
import BundledProductModuleService from '../../../modules/bundled-product/service';

type CreateCustomBundleStepInput = {
  bundle_price: number;
  bundle_id: string;
  metadata: Record<string, unknown>;
};

export const createCustomBundleStep = createStep(
  'create-custom-bundle',
  async (input: CreateCustomBundleStepInput, { container }) => {
    const bundledProductService: BundledProductModuleService = container.resolve(BUNDLED_PRODUCT_MODULE);

    const customBundle = await bundledProductService.createCustomBundles({
      bundle_price: input.bundle_price,
      bundle_id: input.bundle_id,
      metadata: input.metadata,
    });

    return new StepResponse(customBundle, {
      custom_bundle_id: customBundle.id,
      bundle_id: customBundle.bundle_id,
    });
  },
  async (data, { container }) => {
    if (!data?.custom_bundle_id) {
      return;
    }

    // Rollback: delete the custom bundle record
    const bundledProductService: BundledProductModuleService = container.resolve(BUNDLED_PRODUCT_MODULE);
    await bundledProductService.deleteCustomBundles([data.custom_bundle_id]);
  },
);
