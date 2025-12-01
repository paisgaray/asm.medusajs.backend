import { MedusaError } from '@medusajs/framework/utils';
import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk';

import { WISHLIST_MODULE } from '../../../modules/wishlist';
import WishlistService from '../../../modules/wishlist/service';
import { upsertWishlistItem, type UpsertWishlistItemInput } from './helpers/upsert-wishlist-item';

type BulkAddWishlistItemsStepInput = {
  wishlist_id: string;
  items: UpsertWishlistItemInput[];
};

export const bulkAddWishlistItemsStep = createStep(
  'bulk-add-wishlist-items-step',
  async (input: BulkAddWishlistItemsStepInput, { container }) => {
    if (!input.items || input.items.length === 0) {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, 'At least one item must be provided to add to wishlist');
    }

    const hasValidItem = input.items.some((item) => item?.product_variant_id);

    if (!hasValidItem) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        'At least one item with product_variant_id must be provided to add to wishlist',
      );
    }

    const wishlistService: WishlistService = container.resolve(WISHLIST_MODULE);

    const consolidatedItems = new Map<string, UpsertWishlistItemInput>();

    for (const item of input.items) {
      if (!item.product_variant_id) {
        continue;
      }

      const itemKey = `variant_${item.product_variant_id}`;

      const existing = consolidatedItems.get(itemKey);
      const incomingQuantity = item.quantity !== undefined && item.quantity !== null ? item.quantity : 1;
      const accumulatedQuantity =
        existing?.quantity !== undefined && existing.quantity !== null ? existing.quantity : 0;

      consolidatedItems.set(itemKey, {
        wishlist_id: input.wishlist_id,
        product_id: item.product_id ?? existing?.product_id,
        product_variant_id: item.product_variant_id,
        quantity: accumulatedQuantity + incomingQuantity,
      });
    }

    const addedItems = [];

    for (const item of consolidatedItems.values()) {
      const upsertedItem = await upsertWishlistItem(wishlistService, item);
      addedItems.push(upsertedItem);
    }

    return new StepResponse({
      items: addedItems,
    });
  },
);
