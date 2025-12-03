import { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';

import { createWishlistWorkflow, listWishlistsWorkflow } from '../../../workflows/wishlist';
import type { StoreWishlistCreateBody, StoreWishlistListQuery } from './validators';

export async function GET(req: MedusaRequest<undefined, StoreWishlistListQuery>, res: MedusaResponse): Promise<void> {
  const query = req.filterableFields as StoreWishlistListQuery;

  const { result } = await listWishlistsWorkflow(req.scope).run({
    input: {
      customer_id: query.customer_id,
      list_config: req.listConfig,
    },
  });

  res.json({
    wishlists: result.wishlists,
    count: result.count,
    limit: req.listConfig.take ?? result.wishlists.length,
    offset: req.listConfig.skip ?? 0,
  });
}

export async function POST(req: MedusaRequest<StoreWishlistCreateBody>, res: MedusaResponse): Promise<void> {
  const body = req.validatedBody as StoreWishlistCreateBody;

  const { result } = await createWishlistWorkflow(req.scope).run({
    input: {
      customer_id: body.customer_id,
      name: body.name,
    },
  });

  res.json({ wishlist: result.wishlist });
}
