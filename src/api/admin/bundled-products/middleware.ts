import { validateAndTransformBody, validateAndTransformQuery } from '@medusajs/framework';
import { MiddlewareRoute } from '@medusajs/medusa';

import { bundledProductsIdMiddlewares } from './[id]/middleware';
import { CreateBundledProductsSchema, findParams } from './validators';

const bundledListQueryConfig = {
  defaults: ['id', 'product.*', 'items.*', 'items.product.*'],
  isList: true,
  defaultLimit: 15,
};

export const bundledProductsMiddlewares: MiddlewareRoute[] = [
  ...bundledProductsIdMiddlewares,
  {
    matcher: '/admin/bundled-products',
    methods: ['GET'],
    middlewares: [validateAndTransformQuery(findParams, bundledListQueryConfig)],
  },
  {
    matcher: '/admin/bundled-products',
    methods: ['POST'],
    middlewares: [validateAndTransformBody(CreateBundledProductsSchema)],
  },
];
