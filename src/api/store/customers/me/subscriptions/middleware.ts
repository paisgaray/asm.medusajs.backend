import { MiddlewareRoute } from '@medusajs/medusa';

import { updateSubscriptionAddressMiddlewares } from './[id]/address/middleware';
import { updateSubscriptionFrequencyMiddlewares } from './[id]/frequency/middleware';

export const subscriptionMiddlewares: MiddlewareRoute[] = [
  ...updateSubscriptionAddressMiddlewares,
  ...updateSubscriptionFrequencyMiddlewares,
];
