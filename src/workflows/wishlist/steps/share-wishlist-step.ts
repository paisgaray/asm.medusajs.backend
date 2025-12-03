import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk';
import { randomBytes } from 'crypto';

import { WISHLIST_MODULE } from '../../../modules/wishlist';
import WishlistService from '../../../modules/wishlist/service';

type ShareWishlistStepInput = {
  wishlist_id: string;
};

export const shareWishlistStep = createStep(
  'share-wishlist-step',
  async (input: ShareWishlistStepInput, { container }) => {
    const wishlistService: WishlistService = container.resolve(WISHLIST_MODULE);

    let shareToken: string;
    let attempts = 0;
    const maxAttempts = 10;

    do {
      shareToken = randomBytes(32).toString('hex');
      const existingWishlists = await wishlistService.listWishlists({
        share_token: shareToken,
      });

      if (existingWishlists.length === 0) {
        break;
      }

      attempts++;
      if (attempts >= maxAttempts) {
        throw new Error('Failed to generate unique share token after multiple attempts');
      }
    } while (attempts < maxAttempts);

    const currentWishlist = await wishlistService.retrieveWishlist(input.wishlist_id);

    if (currentWishlist.share_token && currentWishlist.share_token.trim() !== '') {
      shareToken = currentWishlist.share_token;
    } else {
      await wishlistService.updateWishlistById(input.wishlist_id, {
        share_token: shareToken,
      });
    }
    const updatedWishlist = await wishlistService.retrieveWishlist(input.wishlist_id);
    const items = await wishlistService.listWishlistItems({
      wishlist_id: input.wishlist_id,
    });

    return new StepResponse({
      share_token: shareToken,
      wishlist_id: updatedWishlist.id,
      wishlist: {
        ...updatedWishlist,
        items,
      },
    });
  },
);
