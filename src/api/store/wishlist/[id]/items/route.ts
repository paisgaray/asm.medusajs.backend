import { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';
import { ContainerRegistrationKeys } from '@medusajs/framework/utils';

import { WISHLIST_MODULE } from '../../../../../modules/wishlist';
import WishlistService from '../../../../../modules/wishlist/service';
import { addItemToWishlistWorkflow } from '../../../../../workflows/wishlist';
import { validateWishlistOwnership } from '../../middleware';
import { handleErrorResponse } from '../../utils';

type WishlistItemRecord = {
  id: string;
  wishlist_id: string;
  product_id: string | null;
  product_variant_id: string | null;
  bundle_id: string | null;
  quantity: number;
  [key: string]: unknown;
};

type ProductEntry = {
  id?: string;
  title?: string | null;
  handle?: string | null;
};

type ProductVariantEntry = {
  id: string;
  title?: string | null;
  sku?: string | null;
  product?: ProductEntry | null;
};

type BundleItemEntry = {
  id: string;
  product?: {
    id?: string;
    title?: string | null;
    variants?: ProductVariantEntry[];
  } | null;
};

type BundleEntry = {
  id: string;
  title?: string | null;
  items?: BundleItemEntry[];
};

type WishlistItemWithRelations = WishlistItemRecord & {
  variant?: ProductVariantEntry;
  bundle?: BundleEntry;
};

type AddItemBody = {
  product_id?: string;
  product_variant_id?: string;
  bundle_id?: string;
  quantity?: number;
};

export async function GET(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  await validateWishlistOwnership(req, res, async () => {
    const wishlistService: WishlistService = req.scope.resolve(WISHLIST_MODULE);
    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);
    const wishlistId = req.params.id as string;

    try {
      const items = (await wishlistService.listWishlistItems({
        wishlist_id: wishlistId,
      })) as WishlistItemRecord[];

      const itemsWithRelations = await Promise.all(
        items.map(async (item): Promise<WishlistItemWithRelations> => {
          const itemData: WishlistItemWithRelations = { ...item };

          if (item.product_variant_id) {
            try {
              const variantResult = (await query.graph({
                entity: 'product_variant',
                fields: ['id', 'title', 'sku', 'product.id', 'product.title', 'product.handle'],
                filters: {
                  id: item.product_variant_id,
                },
              })) as { data?: ProductVariantEntry[] };

              if (variantResult.data && variantResult.data.length > 0) {
                itemData.variant = variantResult.data[0];
              }
            } catch (error) {
              // Ignore errors when fetching variant
            }
          }

          if (item.bundle_id) {
            try {
              const bundleResult = (await query.graph({
                entity: 'bundle',
                fields: ['id', 'title', 'items.*', 'items.product.*', 'items.product.variants.*'],
                filters: {
                  id: item.bundle_id,
                },
              })) as { data?: BundleEntry[] };

              if (bundleResult.data && bundleResult.data.length > 0) {
                itemData.bundle = bundleResult.data[0];
              }
            } catch (error) {
              // Ignore errors when fetching bundle
            }
          }

          return itemData;
        }),
      );

      res.json({ items: itemsWithRelations });
    } catch (error: unknown) {
      handleErrorResponse(res, 500, 'Failed to retrieve wishlist items', error);
    }
  });
}

export async function POST(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  await validateWishlistOwnership(req, res, async () => {
    const wishlistId = req.params.id as string;
    const { product_id, product_variant_id, bundle_id, quantity = 1 } = req.body as AddItemBody;

    if (!product_variant_id && !bundle_id) {
      res.status(400).json({
        message: 'Either product_variant_id or bundle_id is required',
      });
      return;
    }

    if (product_variant_id && !product_id) {
      res.status(400).json({
        message: 'product_id is required when product_variant_id is provided',
      });
      return;
    }

    if (product_variant_id && bundle_id) {
      res.status(400).json({
        message: 'Cannot provide both product_variant_id and bundle_id',
      });
      return;
    }

    try {
      const { result } = await addItemToWishlistWorkflow(req.scope).run({
        input: {
          wishlist_id: wishlistId,
          product_id,
          product_variant_id,
          bundle_id,
          quantity,
        },
      });

      res.json({ item: result.item });
    } catch (error: unknown) {
      handleErrorResponse(res, 400, 'Failed to add item to wishlist', error);
    }
  });
}

export async function DELETE(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  await validateWishlistOwnership(req, res, async () => {
    const wishlistService: WishlistService = req.scope.resolve(WISHLIST_MODULE);
    const wishlistId = req.params.id as string;

    try {
      const items = await wishlistService.listWishlistItems({
        wishlist_id: wishlistId,
      });

      for (const item of items) {
        await wishlistService.deleteWishlistItems(item.id);
      }

      res.json({
        message: 'All items removed from wishlist',
        deleted_count: items.length,
      });
    } catch (error: unknown) {
      handleErrorResponse(res, 500, 'Failed to remove items from wishlist', error);
    }
  });
}
