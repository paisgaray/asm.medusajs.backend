import { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';

import { WISHLIST_MODULE } from '../../../../modules/wishlist';
import WishlistService from '../../../../modules/wishlist/service';
import { validateWishlistOwnership } from '../middleware';

export async function GET(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  await validateWishlistOwnership(req, res, async () => {
    const wishlistService: WishlistService = req.scope.resolve(WISHLIST_MODULE);
    const wishlistId = req.params.id as string;

    const wishlist = await wishlistService.retrieveWishlist(wishlistId);
    const items = await wishlistService.listWishlistItems({
      wishlist_id: wishlistId,
    });

    res.json({
      wishlist: {
        ...wishlist,
        items,
      },
    });
  });
}
