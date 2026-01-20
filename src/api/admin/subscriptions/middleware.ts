import { MiddlewareRoute, validateAndTransformQuery } from '@medusajs/framework/http';
import { createFindParams } from '@medusajs/medusa/api/utils/validators';

export const GetCustomSchema = createFindParams();

export const subscriptionMiddlewares: MiddlewareRoute[] = [
  {
    matcher: '/admin/subscriptions',
    method: 'GET',
    middlewares: [
      validateAndTransformQuery(GetCustomSchema, {
        defaults: ['id', 'subscription_date', 'expiration_date', 'status', 'metadata.*', 'orders.*', 'customer.*'],
        isList: true,
      }),
    ],
  },
];
