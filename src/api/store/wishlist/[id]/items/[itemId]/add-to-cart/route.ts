import { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';

import { addSingleWishlistItemToCartWithCartWorkflow } from '../../../../../../../workflows/wishlist';
import type { WishlistAddToCartBody } from '../../../../validators';

type WishlistItemToCartResult = {
  status: number;
  body: Record<string, unknown>;
};

export async function POST(req: MedusaRequest<WishlistAddToCartBody>, res: MedusaResponse): Promise<void> {
  const { result } = await addSingleWishlistItemToCartWithCartWorkflow(req.scope).run({
    input: {
      item_id: req.params.itemId as string,
      cart_id: (req.validatedBody as WishlistAddToCartBody).cart_id,
      region_id: req.query.region_id as string | undefined,
    },
  });

  const response = result as WishlistItemToCartResult;

  res.status(response.status).json(response.body);
}
