import { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';

import { addWishlistToCartWorkflow } from '../../../../../workflows/wishlist';
import type { WishlistAddToCartBody } from '../../validators';

export async function POST(req: MedusaRequest<WishlistAddToCartBody>, res: MedusaResponse): Promise<void> {
  const body = req.validatedBody as WishlistAddToCartBody;

  const { result } = await addWishlistToCartWorkflow(req.scope).run({
    input: {
      wishlist_id: req.params.id as string,
      cart_id: body.cart_id,
      region_id: req.query.region_id as string | undefined,
    },
  });

  res.json(result);
}
