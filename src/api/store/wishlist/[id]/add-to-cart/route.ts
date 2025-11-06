import { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';
import { createCartWorkflow } from '@medusajs/medusa/core-flows';
import { addWishlistItemToCartWorkflow } from '../../../../../workflows/wishlist/add-wishlist-item-to-cart';
import { WISHLIST_MODULE } from '../../../../../modules/wishlist';
import WishlistService from '../../../../../modules/wishlist/service';
import { validateWishlistOwnership } from '../../middleware';

export async function POST(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  await validateWishlistOwnership(req, res, async () => {
    const wishlistService: WishlistService = req.scope.resolve(WISHLIST_MODULE);
    const wishlistId = req.params.id as string;
    const { cart_id } = req.body as { cart_id?: string };
    const regionId = req.query.region_id as string | undefined;

    try {
      const wishlist = await wishlistService.retrieveWishlist(wishlistId);
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

      let finalCartId = cart_id;

      if (!finalCartId) {
        try {
          const { result: cartResult } = await createCartWorkflow(req.scope).run({
            input: {
              region_id: regionId,
            },
          });
          finalCartId = cartResult.id;
        } catch (error: unknown) {
          let errorMessage: string;
          if (error instanceof Error) {
            errorMessage = error.message;
          } else if (typeof error === 'object' && error !== null) {
            try {
              const errorObj = error as { message?: string; type?: string };
              errorMessage = errorObj.message || JSON.stringify(error);
            } catch {
              errorMessage = String(error);
            }
          } else {
            errorMessage = String(error);
          }

          res.status(500).json({
            message: 'Failed to create cart',
            error: errorMessage,
          });
          return;
        }
      }

      const addedItems: Array<{ item_id: string; variant_id: string; quantity: number }> = [];
      const errors: Array<{ item_id: string; error: string }> = [];

      let finalCart;

      for (const item of itemsWithVariants) {
        try {
          const { result } = await addWishlistItemToCartWorkflow(req.scope).run({
            input: {
              cart_id: finalCartId,
              variant_id: item.product_variant_id!,
              quantity: item.quantity,
            },
          });

          addedItems.push({
            item_id: item.id,
            variant_id: item.product_variant_id!,
            quantity: item.quantity,
          });

          finalCart = result.cart;
        } catch (error: unknown) {
          const errorMessage =
            error instanceof Error
              ? error.message
              : typeof error === 'object' && error !== null
                ? JSON.stringify(error)
                : String(error);

          errors.push({
            item_id: item.id,
            error: errorMessage,
          });
        }
      }

      res.json({
        cart: finalCart,
        added_items: addedItems,
        errors: errors.length > 0 ? errors : undefined,
        message: `Added ${addedItems.length} item(s) to cart`,
      });
    } catch (error: unknown) {
      if (error instanceof Error && error.message.includes('not found')) {
        res.status(404).json({ message: 'Wishlist not found' });
        return;
      }
      const errorMessage =
        error instanceof Error
          ? error.message
          : typeof error === 'object' && error !== null
            ? JSON.stringify(error)
            : String(error);

      res.status(500).json({
        message: 'Failed to process request',
        error: errorMessage,
      });
    }
  });
}

