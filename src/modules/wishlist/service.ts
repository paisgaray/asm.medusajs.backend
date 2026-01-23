import { MedusaService } from '@medusajs/framework/utils';

import Wishlist from './models/wishlist';
import WishlistItem from './models/wishlist-item';

type WishlistItemFilterInput = {
  product_variant_id?: string | null;
};

type UpdateWishlistData = {
  name?: string | null;
  share_token?: string;
};

type UpdateWishlistItemData = {
  quantity?: number;
};

class WishlistService extends MedusaService({
  Wishlist,
  WishlistItem,
}) {
  buildItemFilter(input: WishlistItemFilterInput): { product_variant_id?: string } {
    const variantId = input.product_variant_id ?? undefined;

    if (!variantId) {
      throw new Error('product_variant_id must be provided');
    }

    return { product_variant_id: variantId };
  }

  async updateWishlistById(id: string, data: UpdateWishlistData): Promise<void> {
    const updateData: { id: string; name?: string | null; share_token?: string } = { id };

    if (data.name !== undefined) {
      updateData.name = data.name;
    }

    if (data.share_token !== undefined) {
      updateData.share_token = data.share_token;
    }

    await this.updateWishlists(updateData);
  }

  async updateWishlistItemById(id: string, data: UpdateWishlistItemData): Promise<void> {
    if (data.quantity === undefined) {
      return;
    }

    await this.updateWishlistItems({
      selector: { id },
      data: { quantity: data.quantity },
    });
  }
}

export default WishlistService;
