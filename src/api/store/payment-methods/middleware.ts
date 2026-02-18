import { validateAndTransformBody, validateAndTransformQuery } from '@medusajs/framework';
import { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';
import { MedusaError, ContainerRegistrationKeys, Modules } from '@medusajs/framework/utils';
import { MiddlewareRoute } from '@medusajs/medusa';

import {
  StoreCreatePaymentMethodBodySchema,
  StoreDeletePaymentMethodBodySchema,
  StorePaymentMethodsListQuerySchema,
  StoreUpdatePaymentMethodBodySchema,
} from './validators';

const paymentMethodsListQueryConfig = {
  defaults: ['customer_id'],
  isList: false,
};

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
  });

  const hasAccess = links?.some(
    (linkEntry) => linkEntry[Modules.PAYMENT]?.account_holder_id === body.account_holder_id,
  );

  if (!hasAccess) {
    throw new MedusaError(MedusaError.Types.NOT_ALLOWED, 'Access denied');
  }

  next();
}

export const paymentMethodsMiddlewares: MiddlewareRoute[] = [
  {
    matcher: '/store/me/payment-methods',
    methods: ['GET'],
    middlewares: [validateAndTransformQuery(StorePaymentMethodsListQuerySchema, paymentMethodsListQueryConfig)],
  },
  {
    matcher: '/store/me/payment-methods',
    methods: ['POST'],
    middlewares: [validateAndTransformBody(StoreCreatePaymentMethodBodySchema)],
  },
  {
    matcher: '/store/payment-methods/:id',
    methods: ['DELETE'],
    middlewares: [validateAndTransformBody(StoreDeletePaymentMethodBodySchema), ensurePaymentMethodOwnership],
  },
  {
    matcher: '/store/payment-methods/:id',
    methods: ['PUT'],
    middlewares: [validateAndTransformBody(StoreUpdatePaymentMethodBodySchema), ensurePaymentMethodOwnership],
  },
];
