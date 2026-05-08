import { validateAndTransformBody } from '@medusajs/framework';
import { authenticate } from '@medusajs/framework/http';
import { MiddlewareRoute } from '@medusajs/medusa';

import { PostStoreCartLineItemsBatchSchema } from './route';

export const lineItemBatchMiddlewares: MiddlewareRoute[] = [
  {
    matcher: '/store/carts/:id/line-items/batch',
    methods: ['POST'],
    middlewares: [
      authenticate('customer', ['bearer', 'session'], { allowUnauthenticated: true }),
      validateAndTransformBody(PostStoreCartLineItemsBatchSchema),
    ],
  },
];
