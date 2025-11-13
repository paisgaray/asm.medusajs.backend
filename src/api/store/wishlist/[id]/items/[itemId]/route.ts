import { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';

import { removeItemFromWishlistWorkflow } from '../../../../../../workflows/wishlist';

export async function DELETE(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  const { result } = await removeItemFromWishlistWorkflow(req.scope).run({
    input: {
      wishlist_id: req.params.id as string,
      item_id: req.params.itemId as string,
    },
  });

  res.json(result);
}
