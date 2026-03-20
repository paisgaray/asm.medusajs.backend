import { validateAndTransformBody } from '@medusajs/framework';
import { MiddlewareRoute } from '@medusajs/medusa';

import { updateSubscriptionAddressMiddlewares } from './[id]/address/middleware';
import { updateSubscriptionFrequencyMiddlewares } from './[id]/frequency/middleware';
import { AddSubscriptionItemSchema } from './[id]/item/validators';

export const subscriptionMiddlewares: MiddlewareRoute[] = [
  ...updateSubscriptionAddressMiddlewares,
  ...updateSubscriptionFrequencyMiddlewares,
  {
    matcher: '/store/customers/me/subscriptions/:id/item',
    methods: ['POST'],
    middlewares: [validateAndTransformBody(AddSubscriptionItemSchema)],
  },
];
