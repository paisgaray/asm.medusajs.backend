import { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';

import { createPaymentMethodWorkflow, listCustomerPaymentMethodsWorkflow } from '../../../../workflows/payment';
import type { StoreCreatePaymentMethodBody, StorePaymentMethodsListQuery } from '../../payment-methods/validators';

export async function GET(req: MedusaRequest<undefined, StorePaymentMethodsListQuery>, res: MedusaResponse): Promise<void> {
  const query = req.filterableFields as StorePaymentMethodsListQuery;

  if (!query.customer_id) {
    res.status(400).json({ message: 'customer_id is required' });
    return;
  }

  const { result } = await listCustomerPaymentMethodsWorkflow(req.scope).run({
    input: {
      customer_id: query.customer_id,
    },
  });

  res.json({
    payment_methods: result.payment_methods,
  });
}

export async function POST(req: MedusaRequest<StoreCreatePaymentMethodBody>, res: MedusaResponse): Promise<void> {
  const body = req.validatedBody as StoreCreatePaymentMethodBody;

  const { result, errors } = await createPaymentMethodWorkflow(req.scope).run({
    input: {
      customer_id: body.customer_id,
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
