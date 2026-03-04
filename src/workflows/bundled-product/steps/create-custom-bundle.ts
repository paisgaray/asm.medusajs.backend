import { ContainerRegistrationKeys, Modules, QueryContext } from '@medusajs/framework/utils';
import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk';

import { BUNDLED_PRODUCT_MODULE } from '../../../modules/bundled-product';
import BundledProductModuleService from '../../../modules/bundled-product/service';

type Input = {
  currency_code: string;
  bundle_id: string;
};

export const createCustomBundleStep = createStep(
  'create-custom-bundle',
  async ({ bundle_id, currency_code }: Input, { container }) => {
    const query = container.resolve(ContainerRegistrationKeys.QUERY);
    const bundledProductModuleService: BundledProductModuleService = container.resolve(BUNDLED_PRODUCT_MODULE);
    const remoteLink = container.resolve('remoteLink');

    const {
      data: [bundle],
    } = await query.graph({
      entity: 'bundle',
      filters: { id: bundle_id },
      fields: ['product.*', 'product.variants.*', 'product.variants.calculated_price.*'],
      context: { product: { variants: { calculated_price: QueryContext({ currency_code }) } } },
    });

    const customBundle = await bundledProductModuleService.createCustomBundles({ bundle_id });

    await remoteLink.create({
      [BUNDLED_PRODUCT_MODULE]: { custom_bundle_id: customBundle.id },
      [Modules.PRODUCT]: { product_id: bundle.product.id },
    });

    return new StepResponse(customBundle, { customBundleId: customBundle.id, productId: bundle.product.id });
  },
  async ({ customBundleId, productId }, { container }) => {
    if (!customBundleId) return;
    const remoteLink = container.resolve('remoteLink');

    const bundledProductModuleService: BundledProductModuleService = container.resolve(BUNDLED_PRODUCT_MODULE);

    await bundledProductModuleService.deleteCustomBundles(customBundleId);

    await remoteLink.dismiss({
      [BUNDLED_PRODUCT_MODULE]: { custom_bundle_id: customBundleId },
      [Modules.PRODUCT]: { product_id: productId },
    });
  },
);
