import { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';
import { ContainerRegistrationKeys } from '@medusajs/framework/utils';

import { WISHLIST_MODULE } from '../../../../../../../modules/wishlist';
import WishlistService from '../../../../../../../modules/wishlist/service';
import { addBundleToCartWorkflow } from '../../../../../../../workflows/bundled-product/workflows/add-bundle-to-cart';
import { validateItemOwnership } from '../../../../middleware';
import { extractErrorMessage, handleErrorResponse } from '../../../../utils';
import { getOrCreateCart } from '../../../../utils/cart';

type BundleVariantEntry = {
  id: string;
  status?: string | null;
  deleted_at?: string | null;
};

type BundleProductEntry = {
  id?: string;
  variants?: BundleVariantEntry[];
};

type BundleItemEntry = {
  id: string;
  product?: BundleProductEntry | null;
};

type BundleGraphEntry = {
  id: string;
  items?: BundleItemEntry[];
};

type AddBundleToCartBody = {
  cart_id?: string;
  items?: {
    item_id: string;
    variant_id: string;
  }[];
};

export async function POST(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  await validateItemOwnership(req, res, async () => {
    const wishlistService: WishlistService = req.scope.resolve(WISHLIST_MODULE);
    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);
    const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER);
    const itemId = req.params.itemId as string;
    const { cart_id, items } = req.body as AddBundleToCartBody;
    const regionId = req.query.region_id as string | undefined;

    try {
      const item = await wishlistService.retrieveWishlistItem(itemId);

      if (!item.bundle_id) {
        res.status(400).json({
          message: 'Item does not have a bundle_id. Use /add-to-cart for product variants.',
        });
        return;
      }

      const bundleResult = (await query.graph({
        entity: 'bundle',
        fields: ['id', 'items.*', 'items.product.*', 'items.product.variants.*'],
        filters: {
          id: item.bundle_id,
        },
      })) as { data?: BundleGraphEntry[] };

      const bundles = bundleResult.data ?? [];

      if (!bundles || bundles.length === 0) {
        res.status(404).json({
          message: `Bundle ${item.bundle_id} does not exist`,
        });
        return;
      }

      const bundle = bundles[0];

      if (!bundle.items || bundle.items.length === 0) {
        logger?.warn?.(`Bundle ${bundle.id} has no items when processing wishlist ${req.params.id}.`);
        res.status(400).json({
          message: 'Bundle has no items',
        });
        return;
      }

      let bundleItems = items;
      const bundleItemsMap = new Map((bundle.items ?? []).map((bundleItem) => [bundleItem.id, bundleItem]));

      if (!bundleItems || bundleItems.length === 0) {
        const generatedItems = (bundle.items ?? []).map((bundleItem) => {
          const product = bundleItem.product;
          if (!product || !product.variants || product.variants.length === 0) {
            const productId = product?.id ?? 'unknown';
            throw new Error(`Product ${productId} has no variants`);
          }

          const firstPublished = product.variants.find((variant) => {
            return (
              (variant as Record<string, unknown>)?.status === 'published' &&
              !(variant as Record<string, unknown>)?.deleted_at
            );
          });

          const fallback =
            product.variants.find((variant) => !(variant as Record<string, unknown>)?.deleted_at) ||
            product.variants[0];

          if (!firstPublished && !fallback) {
            throw new Error(`Product ${product.id} has no active variants`);
          }

          const selectedVariant = firstPublished ?? fallback;

          return {
            item_id: bundleItem.id,
            variant_id: selectedVariant.id,
          };
        });

        bundleItems = generatedItems;
      } else {
        for (const override of bundleItems) {
          const sourceItem = bundleItemsMap.get(override.item_id);
          if (!sourceItem) {
            throw new Error(`Bundle item ${override.item_id} is not part of bundle ${bundle.id}`);
          }

          const product = sourceItem.product;
          if (!product || !product.variants || product.variants.length === 0) {
            const productId = product?.id ?? 'unknown';
            throw new Error(`Product ${productId} has no variants`);
          }

          const variantMatch = product.variants.find((variant) => variant.id === override.variant_id);
          if (!variantMatch) {
            logger?.warn?.(
              `Variant override ${override.variant_id} is invalid for bundle item ${override.item_id} in bundle ${bundle.id}.`,
            );
            throw new Error(`Variant ${override.variant_id} does not belong to bundle item ${override.item_id}`);
          }
        }
      }

      const cartResult = await getOrCreateCart(req, res, cart_id, regionId);
      if (!cartResult) {
        return;
      }

      const finalCartId = cartResult.cartId;

      try {
        const { result: cart } = await addBundleToCartWorkflow(req.scope).run({
          input: {
            cart_id: finalCartId,
            bundle_id: item.bundle_id,
            quantity: item.quantity || 1,
            items: bundleItems,
          },
        });

        try {
          await wishlistService.deleteWishlistItems(itemId);
        } catch (deleteError) {
          logger?.error?.(
            `Failed to remove wishlist item ${itemId} after adding bundle ${item.bundle_id} to cart ${finalCartId}: ${
              deleteError instanceof Error ? deleteError.message : deleteError
            }`,
          );
        }

        logger?.info?.(
          `Bundle ${item.bundle_id} moved from wishlist ${req.params.id} to cart ${finalCartId} (wishlist item ${itemId}).`,
        );

        res.json({
          cart,
          message: 'Bundle added to cart successfully and removed from wishlist',
        });
      } catch (error: unknown) {
        const errorMessage = extractErrorMessage(error);
        logger?.error?.(
          `Failed to add bundle ${item.bundle_id} from wishlist ${req.params.id} to cart ${finalCartId}: ${errorMessage}`,
        );
        res.status(400).json({
          message: 'Failed to add bundle to cart',
          error: errorMessage,
          bundle_id: item.bundle_id,
          cart_id: finalCartId,
        });
      }
    } catch (error: unknown) {
      if (error instanceof Error && error.message.includes('not found')) {
        res.status(404).json({ message: 'Item not found' });
        return;
      }
      logger?.error?.(
        `Unexpected error while handling bundle movement from wishlist ${req.params.id} (item ${itemId}): ${
          error instanceof Error ? error.message : error
        }`,
      );
      handleErrorResponse(res, 500, 'Failed to process request', error);
    }
  });
}
