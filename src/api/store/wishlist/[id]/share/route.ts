import { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';

import { shareWishlistWorkflow } from '../../../../../workflows/wishlist';
import { handleErrorResponse } from '../../utils';

export async function POST(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  const wishlistId = req.params.id as string;

  try {
    const { result } = await shareWishlistWorkflow(req.scope).run({
      input: {
        wishlist_id: wishlistId,
      },
    });

    res.json({
      share_token: result.share_token,
      share_url: `${req.protocol}://${req.get('host')}/store/wishlist/shared/${result.share_token}`,
      wishlist_id: result.wishlist_id,
      wishlist: result.wishlist,
    });
  } catch (error: unknown) {
    handleErrorResponse(res, 500, 'Failed to share wishlist', error);
  }
}
