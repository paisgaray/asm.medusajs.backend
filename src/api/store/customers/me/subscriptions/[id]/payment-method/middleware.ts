import { validateAndTransformBody } from '@medusajs/framework';
import { MiddlewareRoute } from '@medusajs/medusa';

import { UpdateSubscriptionPaymentMethodSchema } from './validators';

export const updateSubscriptionPaymentMethodMiddlewares: MiddlewareRoute[] = [
  {
    matcher: '/store/customers/me/subscriptions/:id/payment-method',
    methods: ['POST'],
    middlewares: [validateAndTransformBody(UpdateSubscriptionPaymentMethodSchema)],
  },
];
