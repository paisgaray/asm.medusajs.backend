import { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';

import { deletePaymentMethodWorkflow, updatePaymentMethodWorkflow } from '../../../../workflows/payment';
import type { StoreDeletePaymentMethodBody, StoreUpdatePaymentMethodBody } from '../validators';

export async function DELETE(req: MedusaRequest<StoreDeletePaymentMethodBody>, res: MedusaResponse): Promise<void> {
  const body = req.validatedBody as StoreDeletePaymentMethodBody;
  const paymentMethodId = req.params.id as string;

  const { errors } = await deletePaymentMethodWorkflow(req.scope).run({
    input: {
      payment_method_id: paymentMethodId,
      account_holder_id: body.account_holder_id,
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

  res.status(204).send();
}

export async function PUT(req: MedusaRequest<StoreUpdatePaymentMethodBody>, res: MedusaResponse): Promise<void> {
  const body = req.validatedBody as StoreUpdatePaymentMethodBody;
  const paymentMethodId = req.params.id as string;

  await updatePaymentMethodWorkflow(req.scope).run({
    input: {
      payment_method_id: paymentMethodId,
      account_holder_id: body.account_holder_id,
      metadata: body.metadata,
    },
  });

  res.status(200).json({ success: true });
}

