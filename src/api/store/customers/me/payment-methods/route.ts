import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework/http';

import { createPaymentMethodWorkflow, listCustomerPaymentMethodsWorkflow } from '../../../../../workflows/payment';
import type { StoreCreatePaymentMethodBody } from '../../../payment-methods/validators';

export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const customerId = req.auth_context?.actor_id;

  if (!customerId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const { result } = await listCustomerPaymentMethodsWorkflow(req.scope).run({
    input: {
      customer_id: customerId,
    },
  });

  res.json({
    paymentMethods: result.payment_methods,
  });
}

export async function POST(req: AuthenticatedMedusaRequest<StoreCreatePaymentMethodBody>, res: MedusaResponse) {
  const customerId = req.auth_context?.actor_id;
  if (!customerId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const body = req.validatedBody;

  const { result, errors } = await createPaymentMethodWorkflow(req.scope).run({
    input: {
      customer_id: customerId,
      provider_id: body.provider_id,
      payment_method_id: body.payment_method_id,
      metadata: body.metadata,
    },
  });

  if (errors && errors.length > 0) {
    const errorMessages = errors.map((e) => (e instanceof Error ? e.message : String(e))).join('; ');
    res.status(500).json({
      code: 'workflow_error',
      type: 'workflow_error',
      message: errorMessages,
    });
    return;
  }

  if (!result?.payment_method) {
    res.status(500).json({
      code: 'unknown_error',
      type: 'unknown_error',
      message: 'Workflow returned no result',
    });
    return;
  }

  res.status(201).json({
    payment_method: result.payment_method,
    account_holder_id: result.account_holder_id,
  });
}
