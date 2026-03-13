import { validateAndTransformBody } from '@medusajs/framework';
import { MiddlewareRoute } from '@medusajs/medusa';

import { UpdateSubscriptionAddress } from './validators';

export const updateSubscriptionAddressMiddlewares: MiddlewareRoute[] = [
  {
    matcher: '/store/customers/me/subscriptions/:id/address',
    methods: ['POST'],
    middlewares: [validateAndTransformBody(UpdateSubscriptionAddress)],
  },
];
