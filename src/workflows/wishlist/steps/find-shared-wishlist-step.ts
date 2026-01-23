import { MedusaError } from '@medusajs/framework/utils';
import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk';

import { WISHLIST_MODULE } from '../../../modules/wishlist';
import WishlistService from '../../../modules/wishlist/service';

type FindSharedWishlistStepInput = {
  share_token: string;
};

export const findSharedWishlistStep = createStep(
  'find-shared-wishlist-step',
  async (input: FindSharedWishlistStepInput, { container }) => {
    const wishlistService: WishlistService = container.resolve(WISHLIST_MODULE);

    const wishlists = await wishlistService.listWishlists({
      share_token: input.share_token,
    });

    if (!wishlists.length) {
      throw new MedusaError(MedusaError.Types.NOT_FOUND, 'Wishlist not found');
    }

    return new StepResponse(wishlists[0]);
  },
);
