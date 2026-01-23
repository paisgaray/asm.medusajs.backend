import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk';

import { WISHLIST_MODULE } from '../../../modules/wishlist';
import WishlistService from '../../../modules/wishlist/service';

type WishlistItemSelector = Parameters<WishlistService['listWishlistItems']>[0];
export type WishlistItemListConfig = Parameters<WishlistService['listWishlistItems']>[1];

export type ListWishlistItemsStepInput = {
  wishlist_id: string;
  selector?: Partial<WishlistItemSelector>;
  list_config?: WishlistItemListConfig;
};

export const listWishlistItemsStep = createStep(
  'list-wishlist-items-step',
  async (input: ListWishlistItemsStepInput, { container }) => {
    const wishlistService: WishlistService = container.resolve(WISHLIST_MODULE);

    const selector: WishlistItemSelector = {
      ...(input.selector ?? {}),
      wishlist_id: input.wishlist_id,
    };

    const [items, count] = await wishlistService.listAndCountWishlistItems(selector, input.list_config);

    return new StepResponse({ items, count });
  },
);
