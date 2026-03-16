import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework/http';

import {
  changeFrequencySubscriptionWorkflow,
  ChangeFrequencySubscriptionWorkflowInput,
} from '../../../../../../../workflows/subscriptions/change-frequency-subscription';
import { UpdateSubscriptionFrequency } from './validators';

export const POST = async (req: AuthenticatedMedusaRequest<UpdateSubscriptionFrequency>, res: MedusaResponse) => {
  const query = req.scope.resolve('query');
  const customerId = req.auth_context?.actor_id;
  const { id } = req.params;

  if (!customerId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  // Verify subscription belongs to customer (using Links)
  const { data: subscriptions } = await query.graph({
    entity: 'subscription',
    fields: ['id', 'customer.*'],
    filters: { id },
  });

  const subscription = subscriptions[0];

  if (!subscription || subscription.customer?.id !== customerId) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  try {
    const { result } = await changeFrequencySubscriptionWorkflow(req.scope).run({
      input: { ...req.validatedBody, id: subscription.id } as ChangeFrequencySubscriptionWorkflowInput,
    });

    res.json(result);
  } catch (error) {
    req.scope.resolve('logger').error('Failed to update subscription frequency:', error);
    return res.status(500).json({
      message: 'Failed to update subscription frequency',
      error: error.message,
    });
  }
};
