import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk';

import { BUNDLED_PRODUCT_MODULE } from '../../../modules/bundled-product';
import BundledProductModuleService from '../../../modules/bundled-product/service';

type ValidateSubscriptionProductStepInput = {
  bundle_product_id: string;
};

export const validateSubscriptionProductStep = createStep(
  'validate-subscription-product',
  async (input: ValidateSubscriptionProductStepInput, { container }) => {
    const bundleService = container.resolve(BUNDLED_PRODUCT_MODULE) as BundledProductModuleService;

    const bundle = await bundleService.retrieveBundle(input.bundle_product_id, {
      relations: ['items'],
    });

    if (!bundle) {
      throw new Error(`Bundle product with ID ${input.bundle_product_id} not found`);
    }

    if (!bundle.subscription_price) {
      throw new Error(`Bundle product ${input.bundle_product_id} does not have a subscription price`);
    }

    return new StepResponse({
      bundle,
      subscription_price: bundle.subscription_price,
      currency: bundle.currency || 'eur',
    });
  },
);
