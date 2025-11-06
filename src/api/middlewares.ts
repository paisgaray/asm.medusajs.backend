import { defineMiddlewares } from '@medusajs/framework/http';

import { bundledProductsMiddlewares } from './admin/bundled-products/middleware';
import { lineItemBundlesMiddlewares } from './store/carts/[id]/line-item-bundles/middleware';

export default defineMiddlewares({
  routes: [...bundledProductsMiddlewares, ...lineItemBundlesMiddlewares],
});
