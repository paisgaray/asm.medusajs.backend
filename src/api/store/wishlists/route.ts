import { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';
import { WISHLIST_MODULE } from '../../../modules/wishlist';
import WishlistService from '../../../modules/wishlist/service';

export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const wishlistService: WishlistService = req.scope.resolve(WISHLIST_MODULE);
  const customerId = req.query.customer_id as string;

  if (!customerId) {
    res.status(400).json({ message: 'customer_id is required' });
    return;
  }

  const wishlists = await wishlistService.listWishlists({ customer_id: customerId });

  res.json({ wishlists });
}

export async function POST(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const wishlistService: WishlistService = req.scope.resolve(WISHLIST_MODULE);
  const { customer_id } = req.body as { customer_id: string };

  if (!customer_id) {
    res.status(400).json({ message: 'customer_id is required' });
    return;
  }

  const existingWishlists = await wishlistService.listWishlists({ customer_id });

  if (existingWishlists.length > 0) {
    res.json({ wishlist: existingWishlists[0] });
    return;
  }

  const wishlist = await wishlistService.createWishlists({ customer_id });

  res.json({ wishlist });
}
