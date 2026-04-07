import { validateAndTransformBody } from '@medusajs/framework';
import { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';
import { ContainerRegistrationKeys, MedusaError, Modules } from '@medusajs/framework/utils';
import { MiddlewareRoute } from '@medusajs/medusa';

import {
  StoreCreatePaymentMethodBodySchema,
  StoreDeletePaymentMethodBodySchema,
  StoreUpdatePaymentMethodBodySchema,
} from './validators';

async function ensurePaymentMethodOwnership(req: MedusaRequest, _res: MedusaResponse, next: () => void): Promise<void> {
  const link = req.scope.resolve(ContainerRegistrationKeys.LINK);
  const body = req.validatedBody as { account_holder_id: string; customer_id: string };

  if (!body?.account_holder_id) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, 'account_holder_id is required');
  }

  if (!body?.customer_id) {
    throw new MedusaError(MedusaError.Types.UNAUTHORIZED, 'Customer ID is required');
  }

  const links = await link.list({
    [Modules.CUSTOMER]: { customer_id: body.customer_id.trim() },
    [Modules.PAYMENT]: { account_holder_id: body.account_holder_id },
  });

  if (!links || links.length === 0) {
    throw new MedusaError(MedusaError.Types.NOT_ALLOWED, 'Access denied');
  }

  next();
}

export const paymentMethodsMiddlewares: MiddlewareRoute[] = [
  // {
  //   matcher: '/store/customers/me/payment-methods',
  //   methods: ['GET'],
  //   middlewares: [validateAndTransformQuery(StorePaymentMethodsListQuerySchema, paymentMethodsListQueryConfig)],
  // },
  {
    matcher: '/store/customers/me/payment-methods',
    methods: ['POST'],
    middlewares: [validateAndTransformBody(StoreCreatePaymentMethodBodySchema)],
  },
  {
    matcher: '/store/customers/me/payment-methods/:id',
    methods: ['DELETE'],
    middlewares: [validateAndTransformBody(StoreDeletePaymentMethodBodySchema), ensurePaymentMethodOwnership],
  },
  {
    matcher: '/store/customers/me/payment-methods/:id',
    methods: ['PUT'],
    middlewares: [validateAndTransformBody(StoreUpdatePaymentMethodBodySchema), ensurePaymentMethodOwnership],
  },
];
