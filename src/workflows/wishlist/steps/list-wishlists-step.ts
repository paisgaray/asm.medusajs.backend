import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk';

import { WISHLIST_MODULE } from '../../../modules/wishlist';
import WishlistService from '../../../modules/wishlist/service';

type WishlistListSelector = Parameters<WishlistService['listWishlists']>[0];
export type WishlistListConfig = Parameters<WishlistService['listWishlists']>[1];

export type ListWishlistsStepInput = {
  customer_id: string;
  list_config?: WishlistListConfig;
};

export const listWishlistsStep = createStep(
  'list-wishlists-step',
  async (input: ListWishlistsStepInput, { container }) => {
    const wishlistService: WishlistService = container.resolve(WISHLIST_MODULE);

    const selector: WishlistListSelector = {
      customer_id: input.customer_id,
    };

    const [wishlists, count] = await wishlistService.listAndCountWishlists(selector, input.list_config);

    return new StepResponse({ wishlists, count });
  },
);
