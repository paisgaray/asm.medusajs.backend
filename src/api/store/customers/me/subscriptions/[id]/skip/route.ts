import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework/http';

import { skipSubscriptionWorkflow } from '../../../../../../../workflows/subscriptions';

/**
 * POST /store/customers/me/subscriptions/:id/skip
 * Skip the next billing cycle for the authenticated customer's subscription
 */
export const POST = async (req: AuthenticatedMedusaRequest, res: MedusaResponse) => {
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
    const { result } = await skipSubscriptionWorkflow(req.scope).run({
      input: {
        subscription_id: id,
      },
    });

    res.json(result);
  } catch (error) {
    req.scope.resolve('logger').error('Failed to skip subscription:', error);
    return res.status(500).json({
      message: 'Failed to skip subscription',
      error: error.message,
    });
  }
};
