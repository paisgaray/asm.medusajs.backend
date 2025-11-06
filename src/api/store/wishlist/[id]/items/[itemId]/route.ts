import { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';
import { removeItemFromWishlistWorkflow } from '../../../../../../workflows/wishlist';
import { validateItemOwnership } from '../../../middleware';

export async function DELETE(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  await validateItemOwnership(req, res, async () => {
    const wishlistId = req.params.id as string;
    const itemId = req.params.itemId as string;

    try {
      const { result } = await removeItemFromWishlistWorkflow(req.scope).run({
        input: {
          wishlist_id: wishlistId,
          item_id: itemId,
        },
      });

      res.json(result);
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
        message: 'Failed to remove item from wishlist',
        error: errorMessage,
      });
    }
  });
}

