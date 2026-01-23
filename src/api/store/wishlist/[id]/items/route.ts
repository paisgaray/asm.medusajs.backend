import { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';

import {
  addItemToWishlistFlexibleWorkflow,
  deleteWishlistItemsWorkflow,
  listWishlistItemsWorkflow,
  updateWishlistItemsWorkflow,
} from '../../../../../workflows/wishlist';
import type { WishlistItemCreateBody, WishlistItemsListQuery, WishlistItemsUpdateBody } from '../../validators';

export async function GET(req: MedusaRequest<undefined, WishlistItemsListQuery>, res: MedusaResponse): Promise<void> {
  const filters = req.filterableFields as WishlistItemsListQuery;
  const selector = {
    ...(filters.product_id ? { product_id: filters.product_id } : {}),
    ...(filters.product_variant_id ? { product_variant_id: filters.product_variant_id } : {}),
  };

  const { result } = await listWishlistItemsWorkflow(req.scope).run({
    input: {
      wishlist_id: req.params.id as string,
      list_config: req.listConfig,
      filterable_fields: selector,
    },
  });

  res.json({
    items: result.items,
    count: result.count,
    limit: req.listConfig.take ?? result.items.length,
    offset: req.listConfig.skip ?? 0,
  });
}

export async function POST(req: MedusaRequest<WishlistItemCreateBody>, res: MedusaResponse): Promise<void> {
  const body = req.validatedBody as WishlistItemCreateBody;

  const itemsPayload =
    body.items && body.items.length > 0
      ? body.items
      : [
          {
            product_id: body.product_id,
            product_variant_id: body.product_variant_id,
            quantity: body.quantity,
          },
        ];

  const { result } = await addItemToWishlistFlexibleWorkflow(req.scope).run({
    input: {
      wishlist_id: req.params.id as string,
      items: itemsPayload,
    },
  });

  res.json({
    wishlist_id: result.wishlist_id,
    items: result.items,
    item: result.items?.[0],
  });
}

export async function PUT(req: MedusaRequest<WishlistItemsUpdateBody>, res: MedusaResponse): Promise<void> {
  const body = req.validatedBody as WishlistItemsUpdateBody;

  const { result } = await updateWishlistItemsWorkflow(req.scope).run({
    input: {
      wishlist_id: req.params.id as string,
      items: body.items,
    },
  });

  res.json({
    updated: result.updated,
    removed: result.removed,
  });
}

export async function DELETE(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  const { result } = await deleteWishlistItemsWorkflow(req.scope).run({
    input: {
      wishlist_id: req.params.id as string,
    },
  });

  res.json({
    message: 'All items removed from wishlist',
    deleted_count: result.deleted_count,
  });
}
