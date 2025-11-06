import { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';

import { WISHLIST_MODULE } from '../../../../../modules/wishlist';
import WishlistService from '../../../../../modules/wishlist/service';
import { addItemToWishlistWorkflow } from '../../../../../workflows/wishlist';
import { validateWishlistOwnership, validateProductId } from '../../middleware';
import { handleErrorResponse } from '../../utils';

type AddItemBody = {
  product_id: string;
  product_variant_id?: string;
  quantity?: number;
};

export async function POST(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  await validateWishlistOwnership(req, res, async () => {
    await validateProductId(req, res, async () => {
      const wishlistId = req.params.id as string;
      const { product_id, product_variant_id, quantity = 1 } = req.body as AddItemBody;

      if (!product_variant_id) {
        res.status(400).json({
          message: 'product_variant_id is required',
        });
        return;
      }

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
        handleErrorResponse(res, 400, 'Failed to add item to wishlist', error);
      }
    });
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
