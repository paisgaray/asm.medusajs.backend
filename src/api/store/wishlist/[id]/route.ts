import { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';

import {
  deleteWishlistWorkflow,
  getWishlistWithItemsWorkflow,
  updateWishlistWorkflow,
} from '../../../../workflows/wishlist';
import type { StoreWishlistRetrieveQuery, StoreWishlistUpdateBody } from '../validators';

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

export async function PUT(
  req: MedusaRequest<StoreWishlistUpdateBody, StoreWishlistRetrieveQuery>,
  res: MedusaResponse,
): Promise<void> {
  const validatedBody = req.validatedBody as StoreWishlistUpdateBody | undefined;
  const rawBody = req.body as StoreWishlistUpdateBody | undefined;

  const name = validatedBody?.name ?? rawBody?.name;

  const { result } = await updateWishlistWorkflow(req.scope).run({
    input: {
      wishlist_id: req.params.id as string,
      name,
    },
  });

  res.json({
    wishlist: result.wishlist,
  });
}

export async function DELETE(
  req: MedusaRequest<undefined, StoreWishlistRetrieveQuery>,
  res: MedusaResponse,
): Promise<void> {
  const { result } = await deleteWishlistWorkflow(req.scope).run({
    input: {
      wishlist_id: req.params.id as string,
    },
  });

  res.json({
    deleted: result.deleted,
    wishlist_id: result.wishlist_id,
    deleted_items: result.deleted_items,
  });
}
