import { validateAndTransformBody } from '@medusajs/framework';
import { MiddlewareRoute } from '@medusajs/medusa';

import { validatePathParams } from '../../../../utils/validate-path-params';
import { UpdateBundledProductQuerySchema, UpdateBundledProductSchema } from '../validators';
import { bundledProductsItemMiddlewares } from './bundle-item/[itemId]/middleware';

export const bundledProductsIdMiddlewares: MiddlewareRoute[] = [
  ...bundledProductsItemMiddlewares,
  {
    matcher: '/admin/bundled-products/:id',
    methods: ['PUT'],
    middlewares: [
      validatePathParams(UpdateBundledProductQuerySchema),
      validateAndTransformBody(UpdateBundledProductSchema),
    ],
  },
];
