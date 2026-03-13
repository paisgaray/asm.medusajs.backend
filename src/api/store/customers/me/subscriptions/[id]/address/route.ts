import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework/http';

import {
  changeAddressSubscriptionWorkflow,
  ChangeAddressSubscriptionWorkflowInput,
} from '../../../../../../../workflows/subscriptions/change-address-subscription';
import { UpdateSubscriptionAddress } from './validators';

export const POST = async (req: AuthenticatedMedusaRequest<UpdateSubscriptionAddress>, res: MedusaResponse) => {
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
    const { result } = await changeAddressSubscriptionWorkflow(req.scope).run({
      input: { ...req.validatedBody, subscription_id: subscription.id } as ChangeAddressSubscriptionWorkflowInput,
    });

    res.json(result);
  } catch (error) {
    req.scope.resolve('logger').error('Failed to update subscription address:', error);
    return res.status(500).json({
      message: 'Failed to update subscription address',
      error: error.message,
    });
  }
};
