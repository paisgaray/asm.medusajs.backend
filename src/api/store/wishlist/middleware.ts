import { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';

import { WISHLIST_MODULE } from '../../../modules/wishlist';
import WishlistService from '../../../modules/wishlist/service';

export async function validateCustomerId(req: MedusaRequest, res: MedusaResponse, next: () => void): Promise<void> {
  const customerId = req.query.customer_id as string | undefined;

  if (!customerId) {
    res.status(400).json({ message: 'customer_id is required' });
    return;
  }

  next();
}

export async function validateWishlistOwnership(
  req: MedusaRequest,
  res: MedusaResponse,
  next: () => void,
): Promise<void> {
  const wishlistService: WishlistService = req.scope.resolve(WISHLIST_MODULE);
  const wishlistId = req.params.id as string;
  const customerId = req.query.customer_id as string | undefined;

  if (!customerId) {
    next();
    return;
  }

  try {
    const wishlist = await wishlistService.retrieveWishlist(wishlistId);

    if (wishlist.customer_id !== customerId) {
      res.status(403).json({ message: 'Access denied' });
      return;
    }

    next();
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes('not found')) {
      res.status(404).json({ message: 'Wishlist not found' });
      return;
    }
    throw error;
  }
}

export async function validateItemOwnership(req: MedusaRequest, res: MedusaResponse, next: () => void): Promise<void> {
  const wishlistService: WishlistService = req.scope.resolve(WISHLIST_MODULE);
  const wishlistId = req.params.id as string;
  const itemId = req.params.itemId as string;
  const customerId = req.query.customer_id as string | undefined;

  try {
    const item = await wishlistService.retrieveWishlistItem(itemId);

    if (item.wishlist_id !== wishlistId) {
      res.status(404).json({ message: 'Item not found in this wishlist' });
      return;
    }

    if (customerId) {
      try {
        const wishlist = await wishlistService.retrieveWishlist(item.wishlist_id);
        if (wishlist.customer_id !== customerId) {
          res.status(403).json({ message: 'Access denied' });
          return;
        }
      } catch (error: unknown) {
        if (error instanceof Error && error.message.includes('not found')) {
          res.status(404).json({ message: 'Wishlist not found' });
          return;
        }
        throw error;
      }
    }

    next();
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes('not found')) {
      res.status(404).json({ message: 'Item not found' });
      return;
    }
    throw error;
  }
}

export async function validateProductId(req: MedusaRequest, res: MedusaResponse, next: () => void): Promise<void> {
  const { product_id } = req.body as { product_id?: string };

  if (!product_id) {
    res.status(400).json({ message: 'product_id is required' });
    return;
  }

  next();
}
