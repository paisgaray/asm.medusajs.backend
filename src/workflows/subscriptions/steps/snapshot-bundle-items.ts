import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk';

import { BUNDLED_PRODUCT_MODULE } from '../../../modules/bundled-product';
import BundledProductModuleService from '../../../modules/bundled-product/service';
import { SUBSCRIPTION_MODULE } from '../../../modules/subscriptions';
import SubscriptionModuleService from '../../../modules/subscriptions/service';

type SnapshotBundleItemsStepInput = {
  bundle_product_id: string;
  subscription_id: string;
};

export const snapshotBundleItemsStep = createStep(
  'snapshot-bundle-items',
  async (input: SnapshotBundleItemsStepInput, { container }) => {
    const bundleService = container.resolve(BUNDLED_PRODUCT_MODULE) as BundledProductModuleService;
    const subscriptionService = container.resolve(SUBSCRIPTION_MODULE) as SubscriptionModuleService;

    // Get bundle with items
    const bundle = await bundleService.retrieveBundle(input.bundle_product_id, {
      relations: ['items'],
    });

    if (!bundle?.items || bundle.items.length === 0) {
      throw new Error(`Bundle ${input.bundle_product_id} has no items`);
    }

    // Query to get product details for each bundle item
    const query = container.resolve('query');

    const subscriptionItems = [];

    for (const item of bundle.items) {
      // Parse the item details which might contain product_id and variant_id
      let itemDetails;
      try {
        itemDetails = typeof item.details === 'string' ? JSON.parse(item.details) : item.details;
      } catch {
        throw new Error(`Invalid item details format for bundle item ${item.id}`);
      }

      if (!itemDetails?.product_id || !itemDetails?.variant_id) {
        throw new Error(`Bundle item ${item.id} missing product_id or variant_id`);
      }

      // Fetch product and variant details
      const {
        data: [product],
      } = await query.graph({
        entity: 'product',
        filters: { id: itemDetails.product_id },
        fields: ['id', 'title', 'variants.*'],
      });

      const variant = product?.variants?.find((v: any) => v.id === itemDetails.variant_id);

      if (!product || !variant) {
        throw new Error(`Product or variant not found for bundle item ${item.id}`);
      }

      const snapshot = {
        product_id: product.id,
        variant_id: variant.id,
        product_title: product.title,
        variant_title: variant.title,
        quantity: item.quantity,
        unit_price: variant.calculated_price?.calculated_amount,
      };

      subscriptionItems.push({
        subscription_id: input.subscription_id,
        product_id: snapshot.product_id,
        variant_id: snapshot.variant_id,
        quantity: snapshot.quantity,
        product_snapshot: snapshot,
      });
    }

    // Create subscription items
    const createdItems = await subscriptionService.createSubscriptionItems(subscriptionItems);

    return new StepResponse(
      { subscription_items: createdItems },
      { subscription_item_ids: createdItems.map((item: any) => item.id) },
    );
  },
  async (data, { container }) => {
    if (!data?.subscription_item_ids || data.subscription_item_ids.length === 0) {
      return;
    }

    // Rollback: delete subscription items
    const subscriptionService = container.resolve(SUBSCRIPTION_MODULE) as SubscriptionModuleService;
    await subscriptionService.deleteSubscriptionItems(data.subscription_item_ids);
  },
);
