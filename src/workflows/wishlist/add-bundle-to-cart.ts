import { MedusaError } from '@medusajs/framework/utils';
import { createWorkflow, transform, WorkflowResponse } from '@medusajs/framework/workflows-sdk';

import { ensureCartIdStep } from './steps/ensure-cart-id-step';
import { fetchBundleGraphStep } from './steps/fetch-bundle-graph-step';
import { moveBundleToCartStep } from './steps/move-bundle-to-cart-step';
import { prepareBundleItemsStep } from './steps/prepare-bundle-items-step';
import { retrieveWishlistItemStep } from './steps/retrieve-wishlist-item-step';

type BundleItemOverride = {
  item_id: string;
  variant_id: string;
};

type AddWishlistBundleToCartWorkflowInput = {
  wishlist_id: string;
  item_id: string;
  cart_id?: string;
  region_id?: string;
  items?: BundleItemOverride[];
};

export const addWishlistBundleToCartWorkflow = createWorkflow(
  'add-wishlist-bundle-to-cart',
  (input: AddWishlistBundleToCartWorkflowInput) => {
    const item = retrieveWishlistItemStep({ item_id: input.item_id });

    const bundleId = transform({ item }, ({ item }) => {
      if (!item.bundle_id) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          'Item does not have a bundle_id. Use /add-to-cart for product variants.',
        );
      }
      return item.bundle_id;
    });

    const bundle = fetchBundleGraphStep({ bundle_id: bundleId });

    const preparedItems = prepareBundleItemsStep({ bundle, overrides: input.items });

    const cart = ensureCartIdStep({ cart_id: input.cart_id, region_id: input.region_id });

    const result = moveBundleToCartStep({
      wishlist_item_id: input.item_id,
      wishlist_id: input.wishlist_id,
      bundle_id: preparedItems.bundle_id,
      cart_id: cart.cart_id,
      quantity: transform({ item }, ({ item }) => item.quantity || 1),
      items: preparedItems.items,
    });

    return new WorkflowResponse(result);
  },
);
