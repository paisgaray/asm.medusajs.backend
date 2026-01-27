import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk';

import { WISHLIST_MODULE } from '../../../modules/wishlist';
import WishlistService from '../../../modules/wishlist/service';

type EnsureWishlistStepInput = {
  wishlist_id?: string;
  customer_id?: string;
  name?: string;
};

export const ensureWishlistStep = createStep(
  'ensure-wishlist-step',
  async (input: EnsureWishlistStepInput, { container }) => {
    const wishlistService: WishlistService = container.resolve(WISHLIST_MODULE);

    if (input.wishlist_id) {
      const wishlist = await wishlistService.retrieveWishlist(input.wishlist_id);
      return new StepResponse(wishlist);
    }

    if (input.customer_id) {
      const trimmed = input.customer_id.trim();
      if (trimmed.length === 0) {
        throw new Error('customer_id is required and cannot be empty');
      }

      if (trimmed.includes('{{') || trimmed.includes('}}')) {
        throw new Error('customer_id must be a valid customer ID');
      }

      if (trimmed.length < 3) {
        throw new Error('customer_id must be a valid customer ID');
      }

      const existingWishlists = await wishlistService.listWishlists({
        customer_id: trimmed,
      });

      if (existingWishlists && existingWishlists.length > 0) {
        const existingWishlist = existingWishlists[0];
        if (input.name && existingWishlist.name !== input.name) {
          await wishlistService.updateWishlistById(existingWishlist.id, {
            name: input.name,
          });
          const updated = await wishlistService.retrieveWishlist(existingWishlist.id);
          return new StepResponse(updated);
        }
        return new StepResponse(existingWishlist);
      }

      const wishlist = await wishlistService.createWishlists({
        customer_id: trimmed,
        name: input.name || undefined,
      });
      return new StepResponse(wishlist);
    }

    throw new Error('Either wishlist_id or customer_id must be provided');
  },
);
