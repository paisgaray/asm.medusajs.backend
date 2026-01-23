import { validateAndTransformBody } from '@medusajs/framework';
import { MiddlewareRoute } from '@medusajs/medusa';

import { PostCartsBundledLineItemsSchema } from './route';

export const lineItemBundlesMiddlewares: MiddlewareRoute[] = [
  {
    matcher: '/store/carts/:id/line-item-bundles',
    methods: ['POST'],
    middlewares: [validateAndTransformBody(PostCartsBundledLineItemsSchema)],
  },
];
