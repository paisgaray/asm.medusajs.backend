import { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';
import { createCartWorkflow } from '@medusajs/medusa/core-flows';
import { addWishlistItemToCartWorkflow } from '../../../../../../../workflows/wishlist/add-wishlist-item-to-cart';
import { WISHLIST_MODULE } from '../../../../../../../modules/wishlist';
import WishlistService from '../../../../../../../modules/wishlist/service';
import { validateItemOwnership } from '../../../../middleware';

export async function POST(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  await validateItemOwnership(req, res, async () => {
    const wishlistService: WishlistService = req.scope.resolve(WISHLIST_MODULE);
    const itemId = req.params.itemId as string;
    const { cart_id } = req.body as { cart_id?: string };
    const regionId = req.query.region_id as string | undefined;

    try {
      const item = await wishlistService.retrieveWishlistItem(itemId);

      if (!item.product_variant_id) {
        res.status(400).json({
          message: 'Item does not have a product variant. Cannot add to cart.',
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

      try {
        const { result } = await addWishlistItemToCartWorkflow(req.scope).run({
          input: {
            cart_id: finalCartId,
            variant_id: item.product_variant_id,
            quantity: item.quantity,
          },
        });

        res.json({
          cart: result.cart,
          message: 'Item added to cart successfully',
        });
      } catch (error: unknown) {
        let errorMessage: string;
        let statusCode = 500;

        if (error instanceof Error) {
          errorMessage = error.message;
          if (error.message.includes('do not exist') || error.message.includes('not published')) {
            statusCode = 400;
            errorMessage = `Variante não existe ou o produto não está publicado: ${item.product_variant_id}`;
          }
        } else if (typeof error === 'object' && error !== null) {
          try {
            const errorObj = error as { message?: string; type?: string };
            if (errorObj.message) {
              errorMessage = errorObj.message;
              if (errorObj.message.includes('do not exist') || errorObj.message.includes('not published')) {
                statusCode = 400;
                errorMessage = `Variante não existe ou o produto não está publicado: ${item.product_variant_id}`;
              }
            } else {
              errorMessage = JSON.stringify(error);
            }
          } catch {
            errorMessage = String(error);
          }
        } else {
          errorMessage = String(error);
        }

        res.status(statusCode).json({
          message: 'Failed to add item to cart',
          error: errorMessage,
          variant_id: item.product_variant_id,
          cart_id: finalCartId,
        });
      }
    } catch (error: unknown) {
      if (error instanceof Error && error.message.includes('not found')) {
        res.status(404).json({ message: 'Item not found' });
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

