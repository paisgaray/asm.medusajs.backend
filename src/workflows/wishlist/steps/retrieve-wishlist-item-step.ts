import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk';

import { WISHLIST_MODULE } from '../../../modules/wishlist';
import WishlistService from '../../../modules/wishlist/service';

type RetrieveWishlistItemStepInput = {
  item_id: string;
};

export const retrieveWishlistItemStep = createStep(
  'retrieve-wishlist-item-step',
  async (input: RetrieveWishlistItemStepInput, { container }) => {
    const wishlistService: WishlistService = container.resolve(WISHLIST_MODULE);

    const item = await wishlistService.retrieveWishlistItem(input.item_id);

    return new StepResponse(item);
  },
);
