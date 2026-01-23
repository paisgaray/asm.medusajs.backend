import { validateAndTransformBody } from '@medusajs/framework';
import { defineMiddlewares } from '@medusajs/framework/http';

import { StoreProductSearchBodySchema } from './validators';

export default defineMiddlewares({
  routes: [
    {
      matcher: '/store/products/search',
      method: 'POST',
      bodyParser: { sizeLimit: '1mb' },
      middlewares: [validateAndTransformBody(StoreProductSearchBodySchema)],
    },
  ],
});
