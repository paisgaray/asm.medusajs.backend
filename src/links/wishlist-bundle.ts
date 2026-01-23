import { defineLink } from '@medusajs/framework/utils';

import BundledProductsModule from '../modules/bundled-product';
import WishlistModule from '../modules/wishlist';

export default defineLink(
  {
    linkable: WishlistModule.linkable.wishlistItem,
    field: 'bundle_id',
  },
  BundledProductsModule.linkable.bundle,
  {
    readOnly: true,
  },
);
