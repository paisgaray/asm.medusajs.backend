import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk';

import { WISHLIST_MODULE } from '../../../modules/wishlist';
import WishlistService from '../../../modules/wishlist/service';

type UpdateWishlistStepInput = {
  wishlist_id: string;
  name?: string;
};

export const updateWishlistStep = createStep(
  'update-wishlist-step',
  async (input: UpdateWishlistStepInput, { container }) => {
    const wishlistService: WishlistService = container.resolve(WISHLIST_MODULE);

    if (input.name !== undefined) {
      const trimmedName = input.name.trim();
      const nameValue = trimmedName === '' ? null : trimmedName;

      await wishlistService.updateWishlistById(input.wishlist_id, {
        name: nameValue,
      });
    }

    const wishlist = await wishlistService.retrieveWishlist(input.wishlist_id);

    return new StepResponse(wishlist);
  },
);
