import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk';

import { WISHLIST_MODULE } from '../../../modules/wishlist';
import WishlistService from '../../../modules/wishlist/service';

type CountWishlistItemsStepInput = {
  wishlist_id: string;
};

export const countWishlistItemsStep = createStep(
  'count-wishlist-items-step',
  async (input: CountWishlistItemsStepInput, { container }) => {
    const wishlistService: WishlistService = container.resolve(WISHLIST_MODULE);

    const items = await wishlistService.listWishlistItems({
      wishlist_id: input.wishlist_id,
    });

    return new StepResponse(items.length);
  },
);
