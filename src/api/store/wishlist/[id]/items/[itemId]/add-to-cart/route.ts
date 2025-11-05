import { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';

import { WISHLIST_MODULE } from '../../../../../../../modules/wishlist';
import WishlistService from '../../../../../../../modules/wishlist/service';
import { addWishlistItemToCartWorkflow } from '../../../../../../../workflows/wishlist/add-wishlist-item-to-cart';
import { validateItemOwnership } from '../../../../middleware';
import { extractErrorMessage, handleErrorResponse } from '../../../../utils';
import { getOrCreateCart } from '../../../../utils/cart';

type AddToCartBody = {
  cart_id?: string;
};

type AddToCartResponse = {
  cart: unknown;
  message: string;
  variant_used?: string;
  original_variant_id?: string;
  fallback_used?: boolean;
};

type ErrorResponse = {
  message: string;
  error: string;
  variant_id: string;
  product_id: string;
  cart_id: string;
  suggestion?: string;
};

function isVariantError(error: unknown): boolean {
  if (error instanceof Error) {
    return (
      error.message.includes('do not exist') ||
      error.message.includes('not published') ||
      error.message.includes('has no valid variants') ||
      error.message.includes('is not published')
    );
  }
  return false;
}

export async function POST(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  await validateItemOwnership(req, res, async () => {
    const wishlistService: WishlistService = req.scope.resolve(WISHLIST_MODULE);
    const itemId = req.params.itemId as string;
    const { cart_id } = req.body as AddToCartBody;
    const regionId = req.query.region_id as string | undefined;

    try {
      const item = await wishlistService.retrieveWishlistItem(itemId);

      if (!item.product_variant_id) {
        res.status(400).json({
          message: 'Item does not have a product variant. Cannot add to cart.',
        });
        return;
      }

      const cartResult = await getOrCreateCart(req, res, cart_id, regionId);
      if (!cartResult) {
        return;
      }

      const finalCartId = cartResult.cartId;

      try {
        const { result } = await addWishlistItemToCartWorkflow(req.scope).run({
          input: {
            cart_id: finalCartId,
            wishlist_id: item.wishlist_id,
            item_id: itemId,
            product_id: item.product_id,
            variant_id: item.product_variant_id,
            quantity: item.quantity,
          },
        });

        const validatedVariant = result.variant_validation;
        const response: AddToCartResponse = {
          cart: result.cart,
          message: 'Item added to cart successfully',
        };

        if (validatedVariant?.fallback) {
          response.variant_used = validatedVariant.variant_id;
          response.original_variant_id = item.product_variant_id;
          response.fallback_used = true;
          response.message = 'Item added to cart successfully (variant was updated to a valid one)';
        }

        res.json(response);
      } catch (error: unknown) {
        const errorMessage = extractErrorMessage(error);
        const statusCode = isVariantError(error) ? 400 : 500;

        const errorResponse: ErrorResponse = {
          message: 'Failed to add item to cart',
          error: isVariantError(error)
            ? `Variante não existe ou o produto não está publicado: ${item.product_variant_id}. Detalhes: ${errorMessage}`
            : errorMessage,
          variant_id: item.product_variant_id,
          product_id: item.product_id,
          cart_id: finalCartId,
        };

        if (errorMessage.includes('has no variants') || errorMessage.includes('does not exist')) {
          errorResponse.suggestion =
            'The variant or product IDs in the wishlist may be incorrect. Please verify the product and variant IDs or remove the item from the wishlist and add it again.';
        }

        res.status(statusCode).json(errorResponse);
      }
    } catch (error: unknown) {
      if (error instanceof Error && error.message.includes('not found')) {
        res.status(404).json({ message: 'Item not found' });
        return;
      }
      handleErrorResponse(res, 500, 'Failed to process request', error);
    }
  });
}
