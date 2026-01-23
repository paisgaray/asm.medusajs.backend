import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk';

import { WISHLIST_MODULE } from '../../../modules/wishlist';
import WishlistService from '../../../modules/wishlist/service';

type DeleteWishlistStepInput = {
  wishlist_id: string;
};

type DeleteWishlistStepOutput = {
  wishlist_id: string;
  deleted: boolean;
  deleted_items: number;
};

export const deleteWishlistStep = createStep(
  'delete-wishlist-step',
  async (input: DeleteWishlistStepInput, { container }) => {
    const wishlistService: WishlistService = container.resolve(WISHLIST_MODULE);

    const items = await wishlistService.listWishlistItems({
      wishlist_id: input.wishlist_id,
    });

    await Promise.all(items.map((item) => wishlistService.deleteWishlistItems(item.id)));
    await wishlistService.deleteWishlists(input.wishlist_id);

    const result: DeleteWishlistStepOutput = {
      wishlist_id: input.wishlist_id,
      deleted: true,
      deleted_items: items.length,
    };

    return new StepResponse(result);
  },
);
