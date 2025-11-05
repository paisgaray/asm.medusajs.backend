import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk';
import { WISHLIST_MODULE } from '../../../modules/wishlist';
import WishlistService from '../../../modules/wishlist/service';

type CreateWishlistStepInput = {
  customer_id: string;
};

export const createWishlistStep = createStep(
  'create-wishlist-step',
  async (input: CreateWishlistStepInput, { container }) => {
    const wishlistService: WishlistService = container.resolve(WISHLIST_MODULE);

    const existingWishlists = await wishlistService.listWishlists({
      customer_id: input.customer_id,
    });

    if (existingWishlists.length > 0) {
      return new StepResponse(existingWishlists[0]);
    }

    const wishlist = await wishlistService.createWishlists({
      customer_id: input.customer_id,
    });

    return new StepResponse(wishlist);
  },
);

