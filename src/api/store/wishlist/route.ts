import { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';

import { WISHLIST_MODULE } from '../../../modules/wishlist';
import WishlistService from '../../../modules/wishlist/service';
import { createWishlistWorkflow } from '../../../workflows/wishlist/create-wishlist';
import { validateCustomerId } from './middleware';
import { handleErrorResponse } from './utils';

export async function GET(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  await validateCustomerId(req, res, async () => {
    const wishlistService: WishlistService = req.scope.resolve(WISHLIST_MODULE);
    const customerId = req.query.customer_id as string;

    const wishlists = await wishlistService.listWishlists({ customer_id: customerId });

    res.json({ wishlists });
  });
}

export async function POST(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  const { customer_id } = req.body as { customer_id?: string };

  if (!customer_id) {
    res.status(400).json({ message: 'customer_id is required' });
    return;
  }

  try {
    const { result } = await createWishlistWorkflow(req.scope).run({
      input: {
        customer_id,
      },
    });

    res.json({ wishlist: result.wishlist });
  } catch (error: unknown) {
    handleErrorResponse(res, 500, 'Failed to create wishlist', error);
  }
}
