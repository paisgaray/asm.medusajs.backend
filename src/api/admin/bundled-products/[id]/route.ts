import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework/http';
import { ContainerRegistrationKeys, Modules } from '@medusajs/framework/utils';

import { BUNDLED_PRODUCT_MODULE } from '../../../../modules/bundled-product';
import BundledProductModuleService from '../../../../modules/bundled-product/service';
import { WISHLIST_MODULE } from '../../../../modules/wishlist';
import WishlistService from '../../../../modules/wishlist/service';

type BundleGraphEntry = {
  id: string;
  product?: {
    id?: string | null;
  } | null;
};

type BundleItemGraphEntry = {
  id: string;
};

export async function DELETE(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const bundleId = req.params.id as string;
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);
  const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER);
  const bundledProductService: BundledProductModuleService = req.scope.resolve(BUNDLED_PRODUCT_MODULE);
  const wishlistService: WishlistService = req.scope.resolve(WISHLIST_MODULE);

  try {
    const bundleResult = (await query.graph({
      entity: 'bundle',
      fields: ['id', 'product.*'],
      filters: {
        id: bundleId,
      },
    })) as { data?: BundleGraphEntry[] };

    const bundle = bundleResult.data?.[0];

    if (!bundle) {
      logger?.warn(`Bundle ${bundleId} not found while attempting deletion.`);
      res.status(404).json({ message: 'Bundle not found' });
      return;
    }

    const productId = bundle.product?.id;
    const wishlistItems = await wishlistService.listWishlistItems({
      bundle_id: bundleId,
    });

    const bundleItemsResult = (await query.graph({
      entity: 'bundle_item',
      fields: ['id'],
      filters: {
        bundle_id: bundleId,
      },
    })) as { data?: BundleItemGraphEntry[] };

    const bundleItemIds = (bundleItemsResult.data ?? []).map((item) => item.id);

    if (wishlistItems.length > 0) {
      const wishlistItemIds = wishlistItems.map((item) => item.id);
      const wishlistIds = Array.from(new Set(wishlistItems.map((item) => item.wishlist_id)));

      try {
        await wishlistService.deleteWishlistItems(wishlistItemIds);
        logger?.info(
          `Removed ${wishlistItemIds.length} wishlist items tied to bundle ${bundleId}. Affected wishlists: ${wishlistIds.join(', ')}`,
        );
      } catch (error) {
        logger?.error(
          `Failed to clean wishlist items for bundle ${bundleId}: ${error instanceof Error ? error.message : error}`,
        );
      }
    }

    if (bundleItemIds.length > 0) {
      try {
        await bundledProductService.deleteBundleItems(bundleItemIds);
      } catch (error) {
        logger?.error(
          `Failed to delete bundle items for bundle ${bundleId}: ${error instanceof Error ? error.message : error}`,
        );
      }
    }

    try {
      await bundledProductService.deleteBundles(bundleId);
    } catch (error) {
      logger?.error(`Failed to delete bundle ${bundleId}: ${error instanceof Error ? error.message : error}`);
    }

    if (productId) {
      try {
        const productModule = req.scope.resolve(Modules.PRODUCT);
        await productModule.deleteProducts([productId]);
      } catch (error) {
        logger?.error(
          `Failed to delete product ${productId} linked to bundle ${bundleId}: ${error instanceof Error ? error.message : error}`,
        );
      }
    }

    res.json({
      message: 'Bundle deleted successfully',
      bundle_id: bundleId,
      product_id: productId,
    });
  } catch (error: unknown) {
    logger?.error(`Unexpected failure deleting bundle ${bundleId}: ${error instanceof Error ? error.message : error}`);
    res.status(500).json({
      message: 'Failed to delete bundle',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
