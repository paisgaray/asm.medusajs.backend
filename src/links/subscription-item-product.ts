import { defineLink } from '@medusajs/framework/utils';
import ProductModule from '@medusajs/medusa/product';

import BundledProductModule from '../modules/bundled-product';

export default defineLink(
  { linkable: BundledProductModule.linkable.customItem, isList: true },
  ProductModule.linkable.product,
);
