import { validateAndTransformBody } from '@medusajs/framework';
import { MiddlewareRoute } from '@medusajs/medusa';

import { CreateCustomBundledProductsSchema } from './validators';

export const customBundleProductsMiddlewares: MiddlewareRoute[] = [
  {
    matcher: '/store/bundle-products/custom',
    methods: ['POST'],
    middlewares: [validateAndTransformBody(CreateCustomBundledProductsSchema)],
  },
];
