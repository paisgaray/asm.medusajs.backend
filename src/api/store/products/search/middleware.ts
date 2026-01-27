import { validateAndTransformBody } from '@medusajs/framework';
import { MiddlewareRoute } from '@medusajs/medusa';

import { StoreProductSearchBodySchema } from './validators';

export const productSearchMiddlewares: MiddlewareRoute[] = [
  {
    matcher: '/store/products/search',
    methods: ['POST'],
    middlewares: [validateAndTransformBody(StoreProductSearchBodySchema)],
  },
];
