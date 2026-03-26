import { validateAndTransformBody } from '@medusajs/framework';
import { MiddlewareRoute } from '@medusajs/medusa';

import { updateSubscriptionAddressMiddlewares } from './[id]/address/middleware';
import { updateSubscriptionFrequencyMiddlewares } from './[id]/frequency/middleware';
import { UpdateSubscriptionItemSchema } from './[id]/item/[item_id]/validators';
import { AddSubscriptionItemSchema } from './[id]/item/validators';
import { updateSubscriptionPaymentMethodMiddlewares } from './[id]/payment-method/middleware';

export const subscriptionMiddlewares: MiddlewareRoute[] = [
  ...updateSubscriptionAddressMiddlewares,
  ...updateSubscriptionFrequencyMiddlewares,
  ...updateSubscriptionPaymentMethodMiddlewares,
  {
    matcher: '/store/customers/me/subscriptions/:id/item',
    methods: ['POST'],
    middlewares: [validateAndTransformBody(AddSubscriptionItemSchema)],
  },
  {
    matcher: '/store/customers/me/subscriptions/:id/item/:item_id',
    methods: ['PATCH'],
    middlewares: [validateAndTransformBody(UpdateSubscriptionItemSchema)],
  },
];
