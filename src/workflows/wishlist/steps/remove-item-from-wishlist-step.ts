import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk';
import { WISHLIST_MODULE } from '../../../modules/wishlist';
import WishlistService from '../../../modules/wishlist/service';

type RemoveItemFromWishlistStepInput = {
  wishlist_id: string;
  item_id: string;
};

export const removeItemFromWishlistStep = createStep(
  'remove-item-from-wishlist-step',
  async (input: RemoveItemFromWishlistStepInput, { container }) => {
    const wishlistService: WishlistService = container.resolve(WISHLIST_MODULE);

    const item = await wishlistService.retrieveWishlistItem(input.item_id);

    if (item.wishlist_id !== input.wishlist_id) {
      throw new Error('Item not found in this wishlist');
    }

    await wishlistService.deleteWishlistItems(input.item_id);

    return new StepResponse({
      id: input.item_id,
      object: 'wishlist_item',
      deleted: true,
    });
  },
);


