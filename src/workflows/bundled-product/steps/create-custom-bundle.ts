import { ContainerRegistrationKeys, Modules, QueryContext } from '@medusajs/framework/utils';
import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk';

import { BUNDLED_PRODUCT_MODULE } from '../../../modules/bundled-product';
import BundledProductModuleService from '../../../modules/bundled-product/service';
import { findSubscriptionVariant } from '../../../utils/resolve-subscription-price';

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
      fields: [
        'product.*',
        'product.variants.*',
        'product.variants.calculated_price.*',
        'product.variants.options.*',
        'product.variants.options.option.*',
      ],
      context: { product: { variants: { calculated_price: QueryContext({ currency_code }) } } },
    });

    const variants = (bundle.product?.variants as any[]) ?? [];
    const variant = findSubscriptionVariant(variants);
    const itemPrice = Math.round((variant?.calculated_price?.calculated_amount ?? 0) * 100);

    const customBundle = await bundledProductModuleService.createCustomBundles({
      bundle_id,
      item_price: itemPrice,
    });

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
