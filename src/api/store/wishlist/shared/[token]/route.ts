import { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';

import { getSharedWishlistWorkflow } from '../../../../../workflows/wishlist';
import type { WishlistItemsListQuery } from '../../validators';

export async function GET(req: MedusaRequest<undefined, WishlistItemsListQuery>, res: MedusaResponse): Promise<void> {
  const query = req.filterableFields as WishlistItemsListQuery;
  const selector = {
    ...(query.product_id ? { product_id: query.product_id } : {}),
    ...(query.product_variant_id ? { product_variant_id: query.product_variant_id } : {}),
  };

  const { result } = await getSharedWishlistWorkflow(req.scope).run({
    input: {
      share_token: req.params.token as string,
      list_config: req.listConfig,
      filterable_fields: selector,
    },
  });

  res.json({
    wishlist: {
      ...result.wishlist,
      items: result.items,
    },
  });
}
