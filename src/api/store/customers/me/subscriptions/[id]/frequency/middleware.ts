import { validateAndTransformBody } from '@medusajs/framework';
import { MiddlewareRoute } from '@medusajs/medusa';

import { UpdateSubscriptionFrequency } from './validators';

export const updateSubscriptionFrequencyMiddlewares: MiddlewareRoute[] = [
  {
    matcher: '/store/customers/me/subscriptions/:id/frequency',
    methods: ['POST'],
    middlewares: [validateAndTransformBody(UpdateSubscriptionFrequency)],
  },
];
