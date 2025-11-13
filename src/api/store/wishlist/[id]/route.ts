import { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';

import { getWishlistWithItemsWorkflow } from '../../../../workflows/wishlist';
import type { StoreWishlistRetrieveQuery } from '../validators';

export async function GET(
  req: MedusaRequest<undefined, StoreWishlistRetrieveQuery>,
  res: MedusaResponse,
): Promise<void> {
  const { result } = await getWishlistWithItemsWorkflow(req.scope).run({
    input: {
      wishlist_id: req.params.id as string,
      retrieve_config: req.retrieveConfig,
      list_config: req.listConfig,
    },
  });

  res.json({
    wishlist: {
      ...result.wishlist,
      items: result.items,
    },
  });
}
