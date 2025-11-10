import { MedusaService } from '@medusajs/framework/utils';

import Wishlist from './models/wishlist';
import WishlistItem from './models/wishlist-item';

type WishlistItemFilterInput = {
  bundle_id?: string | null;
  product_variant_id?: string | null;
};

class WishlistService extends MedusaService({
  Wishlist,
  WishlistItem,
}) {
  buildItemFilter(input: WishlistItemFilterInput): { bundle_id?: string; product_variant_id?: string } {
    const bundleId = input.bundle_id ?? undefined;
    const variantId = input.product_variant_id ?? undefined;

    if (bundleId && variantId) {
      throw new Error('Provide only bundle_id or product_variant_id, not both');
    }

    if (bundleId) {
      return { bundle_id: bundleId };
    }

    if (variantId) {
      return { product_variant_id: variantId };
    }

    throw new Error('Either bundle_id or product_variant_id must be provided');
  }
}

export default WishlistService;
