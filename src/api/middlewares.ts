import { defineMiddlewares } from '@medusajs/framework/http';

import { bundledProductsMiddlewares } from './admin/bundled-products/middleware';
import { regionZipcodeMiddlewares } from './admin/region-zipcodes/middleware';
import { subscriptionMiddlewares } from './admin/subscriptions/middleware';
import { lineItemBundlesMiddlewares } from './store/carts/[id]/line-item-bundles/middleware';
import { productSearchMiddlewares } from './store/products/search/middleware';
import { wishlistMiddlewares } from './store/wishlist/middleware';

export default defineMiddlewares({
  routes: [
    ...bundledProductsMiddlewares,
    ...lineItemBundlesMiddlewares,
    ...productSearchMiddlewares,
    ...wishlistMiddlewares,
    ...regionZipcodeMiddlewares,
    ...subscriptionMiddlewares,
  ],
});
