import { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';
import { addItemToWishlistWorkflow } from '../../../../../workflows/wishlist';
import { validateWishlistOwnership, validateProductId } from '../../middleware';

export async function POST(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  await validateWishlistOwnership(req, res, async () => {
    await validateProductId(req, res, async () => {
      const wishlistId = req.params.id as string;
      const {
        product_id,
        product_variant_id,
        quantity = 1,
      } = req.body as {
        product_id: string;
        product_variant_id?: string;
        quantity?: number;
      };

      try {
        const { result } = await addItemToWishlistWorkflow(req.scope).run({
          input: {
            wishlist_id: wishlistId,
            product_id,
            product_variant_id,
            quantity,
          },
        });

        res.json({ item: result.item });
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : typeof error === 'object' && error !== null
              ? JSON.stringify(error)
              : String(error);

        res.status(500).json({
          message: 'Failed to add item to wishlist',
          error: errorMessage,
        });
      }
    });
  });
}


