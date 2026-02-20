import { ContainerRegistrationKeys } from '@medusajs/framework/utils';
import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk';

import { SUBSCRIPTION_MODULE } from '../../../modules/subscriptions';
import SubscriptionModuleService from '../../../modules/subscriptions/service';

type SnapshotBundleItemsStepInput = {
  bundle_id: string;
  subscription_id: string;
  subscription_bundle_id: string;
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
      fields: ['id', 'title', 'items.*', 'items.product.*', 'items.product.variants.*'],
    });

    if (!bundle) {
      throw new Error(`Bundle ${input.bundle_id} not found`);
    }

    if (!bundle.items || bundle.items.length === 0) {
      throw new Error(`Bundle ${input.bundle_id} has no items`);
    }

    const subscriptionItems = [];

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

      subscriptionItems.push({
        subscription_id: input.subscription_id,
        subscription_bundle_id: input.subscription_bundle_id,
        type: 'bundle',
        quantity: item.quantity,
        item_price: variant.calculated_price?.calculated_amount || 0,
        product_snapshot: snapshot,
      });
    }

    // Create subscription items
    const subscriptionService: SubscriptionModuleService = container.resolve(SUBSCRIPTION_MODULE);
    const createdItems = await subscriptionService.createSubscriptionItems(subscriptionItems);

    // Return items and IDs needed for Link creation in workflow
    return new StepResponse(
      {
        subscription_items: createdItems,
        product_ids: subscriptionItems.map((item) => item.product_snapshot.product_id),
        variant_ids: subscriptionItems.map((item) => item.product_snapshot.variant_id),
      },
      { subscription_item_ids: createdItems.map((item: any) => item.id) },
    );
  },
  async (data, { container }) => {
    if (!data?.subscription_item_ids || data.subscription_item_ids.length === 0) {
      return;
    }

    // Rollback: delete subscription items
    const subscriptionService: SubscriptionModuleService = container.resolve(SUBSCRIPTION_MODULE);
    await subscriptionService.deleteSubscriptionItems(data.subscription_item_ids);
  },
);
