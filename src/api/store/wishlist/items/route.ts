import { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';

import { addItemToWishlistFlexibleWorkflow } from '../../../../workflows/wishlist';
import type { WishlistItemAddToWishlistBody } from '../validators';

export async function POST(req: MedusaRequest<WishlistItemAddToWishlistBody>, res: MedusaResponse): Promise<void> {
  const body = req.validatedBody as WishlistItemAddToWishlistBody;

  const { result } = await addItemToWishlistFlexibleWorkflow(req.scope).run({
    input: {
      wishlist_id: body.wishlist_id,
      customer_id: body.customer_id,
      name: body.name,
      items: body.items,
      product_id: body.product_id,
      product_variant_id: body.product_variant_id,
      quantity: body.quantity,
    },
  });

  res.json({
    wishlist_id: result.wishlist_id,
    items: result.items,
    item: result.items?.[0],
  });
}
