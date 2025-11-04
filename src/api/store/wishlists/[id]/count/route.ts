import { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';

import { WISHLIST_MODULE } from '../../../../../modules/wishlist';
import WishlistService from '../../../../../modules/wishlist/service';

export async function GET(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  const wishlistService: WishlistService = req.scope.resolve(WISHLIST_MODULE);
  const wishlistId = req.params.id as string;
  const customerId = req.query.customer_id as string | undefined;

  if (customerId) {
    const wishlist = await wishlistService.retrieveWishlist(wishlistId);
    if (wishlist.customer_id !== customerId) {
      res.status(403).json({ message: 'Access denied' });
      return;
    }
  }

  const items = await wishlistService.listWishlistItems({
    wishlist_id: wishlistId,
  });

  res.json({ count: items.length });
}
