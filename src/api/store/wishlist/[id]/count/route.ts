import { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';

import { getWishlistItemsCountWorkflow } from '../../../../../workflows/wishlist';

export async function GET(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  const { result } = await getWishlistItemsCountWorkflow(req.scope).run({
    input: {
      wishlist_id: req.params.id as string,
    },
  });

  res.json({ count: result.count });
}
