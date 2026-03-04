import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework/http';

import {
  updateCustomBundledItemWorkflow,
  UpdateCustomBundledItemWorkflowInput,
} from '../../../../../../../../../../workflows/bundled-product/workflows/update-custom-bundle-item';
import { UpdateCustomItemSchema } from './validators';

export const POST = async (req: AuthenticatedMedusaRequest<UpdateCustomItemSchema>, res: MedusaResponse) => {
  const query = req.scope.resolve('query');
  const customerId = req.auth_context?.actor_id;
  const { id, bundleId } = req.params;

  if (!customerId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const {
    data: [subscription],
  } = await query.graph({
    entity: 'subscription',
    fields: ['id', 'customer.*'],
    filters: { id },
  });

  if (!subscription || subscription.customer?.id !== customerId) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  try {
    const { result } = await updateCustomBundledItemWorkflow(req.scope).run({
      input: {
        ...req.validatedBody,
        customBundle_id: bundleId,
        next_billing_date: subscription.next_billing_date,
      } as UpdateCustomBundledItemWorkflowInput,
    });

    res.json(result);
  } catch (error) {
    req.scope.resolve('logger').error('Failed to update custom item at subscription:', error);
    return res.status(500).json({
      message: 'Failed to update custom item at subscription',
      error: error.message,
    });
  }
};
