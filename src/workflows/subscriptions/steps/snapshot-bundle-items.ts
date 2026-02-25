import { ContainerRegistrationKeys } from '@medusajs/framework/utils';
import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk';

import { BUNDLED_PRODUCT_MODULE } from '../../../modules/bundled-product';
import BundledProductModuleService from '../../../modules/bundled-product/service';

type SnapshotBundleItemsStepInput = {
  bundle_id: string;
  custom_bundle_id: string;
};

export const snapshotBundleItemsStep = createStep(
  'snapshot-bundle-items',
  async (input: SnapshotBundleItemsStepInput, { container }) => {
    // Query to get bundle with items
    const query = container.resolve(ContainerRegistrationKeys.QUERY);

    const {
      data: [bundle],
    } = await query.graph({
      entity: 'bundle',
      filters: { id: input.bundle_id },
      fields: ['id', 'items.*', 'items.product.*', 'items.product.variants.*'],
    });

    if (!bundle) {
      throw new Error(`Bundle ${input.bundle_id} not found`);
    }

    if (!bundle.items || bundle.items.length === 0) {
      throw new Error(`Bundle ${input.bundle_id} has no items`);
    }

    const customBundleItems = [];

    // Get product links for all bundle items
    for (const item of bundle.items) {
      const product = item.product;
      const variant = item.product?.variants?.[0];

      if (!variant) {
        throw new Error(`Product ${product.id} has no variants`);
      }

      const snapshot = {
        product_id: product.id,
        variant_id: variant.id,
        product_title: product.title,
        variant_title: variant.title,
        quantity: item.quantity,
        unit_price: variant.calculated_price?.calculated_amount,
      };

      customBundleItems.push({
        custom_bundle_id: input.custom_bundle_id,
        type: 'bundle',
        quantity: item.quantity,
        item_price: variant.calculated_price?.calculated_amount || 0,
        product_snapshot: snapshot,
      });
    }

    // Create custom bundle items
    const bundledProductService: BundledProductModuleService = container.resolve(BUNDLED_PRODUCT_MODULE);
    const createdItems = await bundledProductService.createCustomBundleItems(customBundleItems);

    // Return items and IDs needed for Link creation in workflow
    return new StepResponse(
      {
        custom_bundle_items: createdItems,
        product_ids: customBundleItems.map((item) => item.product_snapshot.product_id),
        variant_ids: customBundleItems.map((item) => item.product_snapshot.variant_id),
      },
      { custom_bundle_item_ids: createdItems.map((item: any) => item.id) },
    );
  },
  async (data, { container }) => {
    if (!data?.custom_bundle_item_ids || data.custom_bundle_item_ids.length === 0) {
      return;
    }

    // Rollback: delete custom bundle items
    const bundledProductService: BundledProductModuleService = container.resolve(BUNDLED_PRODUCT_MODULE);
    await bundledProductService.deleteCustomBundleItems(data.custom_bundle_item_ids);
  },
);
