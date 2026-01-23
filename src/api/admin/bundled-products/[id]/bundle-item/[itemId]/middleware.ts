import { validateAndTransformBody } from '@medusajs/framework';
import { MiddlewareRoute } from '@medusajs/medusa';

import { validatePathParams } from '../../../../../../utils/validate-path-params';
import { UpdateBundledProductItemQuerySchema, UpdateBundledProductItemSchema } from '../../../validators';

export const bundledProductsItemMiddlewares: MiddlewareRoute[] = [
  {
    matcher: '/admin/bundled-products/:id/bundle-item/:itemId',
    methods: ['PUT'],
    middlewares: [
      validatePathParams(UpdateBundledProductItemQuerySchema),
      validateAndTransformBody(UpdateBundledProductItemSchema),
    ],
  },
];
