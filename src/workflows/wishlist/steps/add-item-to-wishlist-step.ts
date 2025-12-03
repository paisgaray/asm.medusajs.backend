import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk';

import { WISHLIST_MODULE } from '../../../modules/wishlist';
import WishlistService from '../../../modules/wishlist/service';
import { upsertWishlistItem, type UpsertWishlistItemInput } from './helpers/upsert-wishlist-item';

type AddItemToWishlistStepInput = UpsertWishlistItemInput;

export const addItemToWishlistStep = createStep(
  'add-item-to-wishlist-step',
  async (input: AddItemToWishlistStepInput, { container }) => {
    const wishlistService: WishlistService = container.resolve(WISHLIST_MODULE);

    const item = await upsertWishlistItem(wishlistService, input);

    return new StepResponse(item);
  },
);
