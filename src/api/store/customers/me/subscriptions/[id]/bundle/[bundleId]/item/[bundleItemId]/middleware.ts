import { validateAndTransformBody } from '@medusajs/framework';
import { MiddlewareRoute } from '@medusajs/medusa';

import { UpdateCustomItemSchema } from './validators';

export const updateCustomItemSubscriptionMiddlewares: MiddlewareRoute[] = [
  {
    matcher: '/store/customers/me/subscriptions/:id/bundle/:bundleId/item/:bundleItemId',
    methods: ['POST'],
    middlewares: [validateAndTransformBody(UpdateCustomItemSchema)],
  },
];
