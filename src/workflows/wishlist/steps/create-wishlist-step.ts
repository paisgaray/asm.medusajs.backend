import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk';

import { WISHLIST_MODULE } from '../../../modules/wishlist';
import WishlistService from '../../../modules/wishlist/service';

type CreateWishlistStepInput = {
  customer_id: string;
  name?: string;
};

export const createWishlistStep = createStep(
  'create-wishlist-step',
  async (input: CreateWishlistStepInput, { container }) => {
    const wishlistService: WishlistService = container.resolve(WISHLIST_MODULE);

    const wishlist = await wishlistService.createWishlists({
      customer_id: input.customer_id,
      name: input.name || undefined,
    });

    return new StepResponse(wishlist);
  },
);
