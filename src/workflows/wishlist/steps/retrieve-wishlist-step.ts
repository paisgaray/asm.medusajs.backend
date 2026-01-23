import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk';

import { WISHLIST_MODULE } from '../../../modules/wishlist';
import WishlistService from '../../../modules/wishlist/service';

type RetrieveWishlistConfig = Parameters<WishlistService['retrieveWishlist']>[1];

export type RetrieveWishlistStepInput = {
  wishlist_id: string;
  config?: RetrieveWishlistConfig;
};

export const retrieveWishlistStep = createStep(
  'retrieve-wishlist-step',
  async (input: RetrieveWishlistStepInput, { container }) => {
    const wishlistService: WishlistService = container.resolve(WISHLIST_MODULE);

    const wishlist = await wishlistService.retrieveWishlist(input.wishlist_id, input.config);

    return new StepResponse(wishlist);
  },
);
