import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk';

import { WISHLIST_MODULE } from '../../../modules/wishlist';
import WishlistService from '../../../modules/wishlist/service';

type EnsureWishlistStepInput = {
  wishlist_id?: string;
  customer_id?: string;
  name?: string;
};

export const ensureWishlistStep = createStep(
  'ensure-wishlist-step',
  async (input: EnsureWishlistStepInput, { container }) => {
    const wishlistService: WishlistService = container.resolve(WISHLIST_MODULE);

    if (input.wishlist_id) {
      const wishlist = await wishlistService.retrieveWishlist(input.wishlist_id);
      return new StepResponse(wishlist);
    }

    if (input.customer_id) {
      const wishlist = await wishlistService.createWishlists({
        customer_id: input.customer_id,
        name: input.name || undefined,
      });
      return new StepResponse(wishlist);
    }

    throw new Error('Either wishlist_id or customer_id must be provided');
  },
);
