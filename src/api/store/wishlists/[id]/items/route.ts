import { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';

import { WISHLIST_MODULE } from '../../../../../modules/wishlist';
import WishlistService from '../../../../../modules/wishlist/service';

export async function POST(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  const wishlistService: WishlistService = req.scope.resolve(WISHLIST_MODULE);
  const wishlistId = req.params.id as string;
  const customerId = req.query.customer_id as string | undefined;
  const {
    product_id,
    product_variant_id,
    quantity = 1,
  } = req.body as {
    product_id: string;
    product_variant_id?: string;
    quantity?: number;
  };

  if (!product_id) {
    res.status(400).json({ message: 'product_id is required' });
    return;
  }

  if (customerId) {
    const wishlist = await wishlistService.retrieveWishlist(wishlistId);
    if (wishlist.customer_id !== customerId) {
      res.status(403).json({ message: 'Access denied' });
      return;
    }
  }

  const allItems = await wishlistService.listWishlistItems({
    wishlist_id: wishlistId,
    product_id,
  });

  const existingItem = allItems.find((item) => {
    const itemVariantId = item.product_variant_id || null;
    const searchVariantId = product_variant_id || null;
    return itemVariantId === searchVariantId;
  });

  let item;
  if (existingItem && existingItem.id && existingItem.id.trim() !== '') {
    try {
      const updated = await wishlistService.updateWishlistItems(
        { id: existingItem.id },
        {
          quantity: existingItem.quantity + quantity,
        },
      );
      item = Array.isArray(updated) ? updated[0] : updated;
    } catch (error: unknown) {
      if (error instanceof Error && error.message.includes('not found')) {
        item = await wishlistService.createWishlistItems({
          wishlist_id: wishlistId,
          product_id,
          product_variant_id: product_variant_id || undefined,
          quantity,
        });
      } else {
        throw error;
      }
    }
  } else {
    item = await wishlistService.createWishlistItems({
      wishlist_id: wishlistId,
      product_id,
      product_variant_id: product_variant_id || undefined,
      quantity,
    });
  }

  res.json({ item });
}
