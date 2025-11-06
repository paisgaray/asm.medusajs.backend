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

    const shareToken = randomBytes(32).toString('hex');
    const currentWishlist = await wishlistService.retrieveWishlist(input.wishlist_id);
    const items = await wishlistService.listWishlistItems({
      wishlist_id: input.wishlist_id,
    });

    await wishlistService.deleteWishlists(input.wishlist_id);

    const newWishlist = await wishlistService.createWishlists({
      customer_id: currentWishlist.customer_id,
      share_token: shareToken,
    });

    for (const item of items) {
      await wishlistService.createWishlistItems({
        wishlist_id: newWishlist.id,
        product_id: item.product_id,
        product_variant_id: item.product_variant_id || undefined,
        quantity: item.quantity,
      });
    }

    const finalWishlist = await wishlistService.retrieveWishlist(newWishlist.id);
    const finalItems = await wishlistService.listWishlistItems({
      wishlist_id: newWishlist.id,
    });

    return new StepResponse({
      share_token: shareToken,
      wishlist_id: finalWishlist.id,
      wishlist: {
        ...finalWishlist,
        items: finalItems,
      },
    });
  },
);
