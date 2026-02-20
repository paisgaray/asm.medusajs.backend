import { Modules } from '@medusajs/framework/utils';
import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk';

import { SUBSCRIPTION_MODULE } from '../../../modules/subscriptions';

type CreateItemLinksInput = {
  subscription_items: any[];
  product_ids: string[];
  variant_ids: string[];
};

export const createItemLinksStep = createStep(
  'create-item-links',
  async (input: CreateItemLinksInput, { container }) => {
    const remoteLink = container.resolve('remoteLink');

    // Create links for subscription_items ↔ products
    const productLinkPromises = input.subscription_items.map((item, index) =>
      remoteLink.create({
        [SUBSCRIPTION_MODULE]: {
          subscription_item_id: item.id,
        },
        [Modules.PRODUCT]: {
          product_id: input.product_ids[index],
        },
      }),
    );

    // Create links for subscription_items ↔ product variants
    const variantLinkPromises = input.subscription_items.map((item, index) =>
      remoteLink.create({
        [SUBSCRIPTION_MODULE]: {
          subscription_item_id: item.id,
        },
        [Modules.PRODUCT]: {
          product_variant_id: input.variant_ids[index],
        },
      }),
    );

    await Promise.all([...productLinkPromises, ...variantLinkPromises]);

    return new StepResponse(
      { subscription_item_ids: input.subscription_items.map((item) => item.id) },
      {
        subscription_item_ids: input.subscription_items.map((item) => item.id),
        product_ids: input.product_ids,
        variant_ids: input.variant_ids,
      },
    );
  },
  async (data, { container }) => {
    if (!data) return;

    const remoteLink = container.resolve('remoteLink');

    // Dismiss product links
    const productLinkPromises = data.subscription_item_ids.map((itemId, index) =>
      remoteLink.dismiss({
        [SUBSCRIPTION_MODULE]: {
          subscription_item_id: itemId,
        },
        [Modules.PRODUCT]: {
          product_id: data.product_ids[index],
        },
      }),
    );

    // Dismiss variant links
    const variantLinkPromises = data.subscription_item_ids.map((itemId, index) =>
      remoteLink.dismiss({
        [SUBSCRIPTION_MODULE]: {
          subscription_item_id: itemId,
        },
        [Modules.PRODUCT]: {
          product_variant_id: data.variant_ids[index],
        },
      }),
    );

    await Promise.all([...productLinkPromises, ...variantLinkPromises]);
  },
);
