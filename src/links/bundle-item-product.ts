import { defineLink } from '@medusajs/framework/utils';
import ProductModule from '@medusajs/medusa/product';

import BundledProductsModule from '../modules/bundled-product';

// Many bundle_items can link to the same product (reusability)
export default defineLink(
  {
    linkable: BundledProductsModule.linkable.bundleItem,
    isList: true,
  },
  ProductModule.linkable.product,
);
