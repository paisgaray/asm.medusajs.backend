import { ContainerRegistrationKeys, QueryContext } from '@medusajs/framework/utils';
import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk';

import { BUNDLED_PRODUCT_MODULE } from '../../../modules/bundled-product';
import BundledProductModuleService from '../../../modules/bundled-product/service';

type Input = {
  currency_code: string;
  bundle_id: string;
  isSubscription: boolean;
};

export const createCustomBundleStep = createStep(
  'create-custom-bundle',
  async ({ bundle_id, isSubscription, currency_code }: Input, { container }) => {
    const query = container.resolve(ContainerRegistrationKeys.QUERY);
    const bundledProductModuleService: BundledProductModuleService = container.resolve(BUNDLED_PRODUCT_MODULE);

    const {
      data: [bundle],
    } = await query.graph({
      entity: 'bundle',
      filters: { id: bundle_id },
      fields: ['product.*', 'product.variants.*', 'product.variants.calculated_price.*'],
      context: { product: { variants: { calculated_price: QueryContext({ currency_code }) } } },
    });

    const customBundle = await bundledProductModuleService.createCustomBundles({
      bundle_id,
      bundle_price: bundle?.product?.variants?.[isSubscription ? 1 : 0]?.calculated_price?.calculated_amount || 0,
    });

    return new StepResponse(customBundle, customBundle.id);
  },
  async (bundleId, { container }) => {
    if (!bundleId) return;

    const bundledProductModuleService: BundledProductModuleService = container.resolve(BUNDLED_PRODUCT_MODULE);

    await bundledProductModuleService.deleteCustomBundles(bundleId);
  },
);
