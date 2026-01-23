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
    if (!input.customer_id || input.customer_id.trim().length === 0) {
      throw new Error('customer_id is required and cannot be empty');
    }

    const trimmed = input.customer_id.trim();
    if (trimmed.includes('{{') || trimmed.includes('}}')) {
      throw new Error('customer_id must be a valid customer ID');
    }

    if (trimmed.length < 3) {
      throw new Error('customer_id must be a valid customer ID');
    }

    const wishlistService: WishlistService = container.resolve(WISHLIST_MODULE);

    const wishlist = await wishlistService.createWishlists({
      customer_id: trimmed,
      name: input.name || undefined,
    });

    return new StepResponse(wishlist);
  },
);
