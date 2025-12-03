import { MedusaError } from '@medusajs/framework/utils';
import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk';

import { WISHLIST_MODULE } from '../../../modules/wishlist';
import WishlistService from '../../../modules/wishlist/service';

type WishlistItemUpdate = {
  item_id: string;
  quantity: number;
};

type UpdateWishlistItemsStepInput = {
  wishlist_id: string;
  items: WishlistItemUpdate[];
};

type UpdateWishlistItemsStepOutput = {
  updated: string[];
  removed: string[];
};

export const updateWishlistItemsStep = createStep(
  'update-wishlist-items-step',
  async (input: UpdateWishlistItemsStepInput, { container }) => {
    const wishlistService: WishlistService = container.resolve(WISHLIST_MODULE);

    const updated: string[] = [];
    const removed: string[] = [];

    for (const item of input.items) {
      const wishlistItem = await wishlistService.retrieveWishlistItem(item.item_id);

      if (wishlistItem.wishlist_id !== input.wishlist_id) {
        throw new MedusaError(MedusaError.Types.NOT_ALLOWED, 'Item does not belong to this wishlist');
      }

      if (item.quantity <= 0) {
        await wishlistService.deleteWishlistItems(item.item_id);
        removed.push(item.item_id);
        continue;
      }

      await wishlistService.updateWishlistItemById(item.item_id, {
        quantity: item.quantity,
      });
      updated.push(item.item_id);
    }

    return new StepResponse<UpdateWishlistItemsStepOutput>({
      updated,
      removed,
    });
  },
);
