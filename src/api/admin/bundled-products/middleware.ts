import { validateAndTransformBody, validateAndTransformQuery } from '@medusajs/framework';
import { MiddlewareRoute } from '@medusajs/medusa';
import { createFindParams } from '@medusajs/medusa/api/utils/validators';

import { PostBundledProductsSchema } from './route';

export const bundledProductsMiddlewares: MiddlewareRoute[] = [
  {
    matcher: '/admin/bundled-products',
    methods: ['POST'],
    middlewares: [validateAndTransformBody(PostBundledProductsSchema)],
  },
  {
    matcher: '/admin/bundled-products',
    methods: ['GET'],
    middlewares: [
      validateAndTransformQuery(createFindParams(), {
        defaults: ['id', 'title', 'product.*', 'items.*', 'items.product.*'],
        isList: true,
        defaultLimit: 15,
      }),
    ],
  },
];
