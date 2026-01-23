import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk';

import { WISHLIST_MODULE } from '../../../modules/wishlist';
import WishlistService from '../../../modules/wishlist/service';

type DeleteWishlistItemsStepInput = {
  wishlist_id: string;
};

type DeleteWishlistItemsStepOutput = {
  deleted_count: number;
};

export const deleteWishlistItemsStep = createStep(
  'delete-wishlist-items-step',
  async (input: DeleteWishlistItemsStepInput, { container }) => {
    const wishlistService: WishlistService = container.resolve(WISHLIST_MODULE);

    const items = await wishlistService.listWishlistItems({
      wishlist_id: input.wishlist_id,
    });

    await Promise.all(items.map((item) => wishlistService.deleteWishlistItems(item.id)));

    const output: DeleteWishlistItemsStepOutput = {
      deleted_count: items.length,
    };

    return new StepResponse(output);
  },
);
