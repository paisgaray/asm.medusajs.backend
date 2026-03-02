import { defineLink } from '@medusajs/framework/utils';
import CartModule from '@medusajs/medusa/cart';

import BundledProductModule from '../modules/bundled-product';

export default defineLink(
  { linkable: BundledProductModule.linkable.customBundle, isList: true },
  CartModule.linkable.cart,
);
