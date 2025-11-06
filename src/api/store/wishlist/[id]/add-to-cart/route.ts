import { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';

import { WISHLIST_MODULE } from '../../../../../modules/wishlist';
import WishlistService from '../../../../../modules/wishlist/service';
import { addWishlistItemToCartWorkflow } from '../../../../../workflows/wishlist/add-wishlist-item-to-cart';
import { validateWishlistOwnership } from '../../middleware';
import { extractErrorMessage, handleErrorResponse } from '../../utils';
import { getOrCreateCart } from '../../utils/cart';

type AddToCartBody = {
  cart_id?: string;
};

type AddedItem = {
  item_id: string;
  variant_id: string;
  quantity: number;
  original_variant_id?: string;
  fallback_used?: boolean;
};

type ItemError = {
  item_id: string;
  error: string;
};

export async function POST(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  await validateWishlistOwnership(req, res, async () => {
    const wishlistService: WishlistService = req.scope.resolve(WISHLIST_MODULE);
    const wishlistId = req.params.id as string;
    const { cart_id } = req.body as AddToCartBody;
    const regionId = req.query.region_id as string | undefined;

    try {
      const items = await wishlistService.listWishlistItems({
        wishlist_id: wishlistId,
      });

      const itemsWithVariants = items.filter((item) => item.product_variant_id);

      if (itemsWithVariants.length === 0) {
        res.status(400).json({
          message: 'No items with variants found in wishlist. Cannot add to cart.',
        });
        return;
      }

      const cartResult = await getOrCreateCart(req, res, cart_id, regionId);
      if (!cartResult) {
        return;
      }

      const finalCartId = cartResult.cartId;
      const addedItems: AddedItem[] = [];
      const errors: ItemError[] = [];
      let finalCart: unknown;

      for (const item of itemsWithVariants) {
        try {
          const { result } = await addWishlistItemToCartWorkflow(req.scope).run({
            input: {
              cart_id: finalCartId,
              wishlist_id: wishlistId,
              item_id: item.id,
              product_id: item.product_id,
              variant_id: item.product_variant_id!,
              quantity: item.quantity,
            },
          });

          const validatedVariant = result.variant_validation;
          const finalVariantId = validatedVariant?.variant_id || item.product_variant_id!;

          addedItems.push({
            item_id: item.id,
            variant_id: finalVariantId,
            quantity: item.quantity,
            original_variant_id: validatedVariant?.fallback ? item.product_variant_id || undefined : undefined,
            fallback_used: validatedVariant?.fallback || false,
          });

          finalCart = result.cart;
        } catch (error: unknown) {
          errors.push({
            item_id: item.id,
            error: extractErrorMessage(error),
          });
        }
      }

      res.json({
        cart: finalCart,
        added_items: addedItems,
        errors: errors.length > 0 ? errors : undefined,
        message: `Added ${addedItems.length} item(s) to cart and removed from wishlist`,
      });
    } catch (error: unknown) {
      if (error instanceof Error && error.message.includes('not found')) {
        res.status(404).json({ message: 'Wishlist not found' });
        return;
      }
      handleErrorResponse(res, 500, 'Failed to process request', error);
    }
  });
}
