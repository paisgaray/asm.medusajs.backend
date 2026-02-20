import { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';

import { cancelSubscriptionWorkflow } from '../../../../../../workflows/subscriptions';

/**
 * POST /store/me/subscriptions/:id/cancel
 * Cancel a subscription for the authenticated customer
 */
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const query = req.scope.resolve('query');
  const customerId = req.user?.userId;
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
    const { result } = await cancelSubscriptionWorkflow(req.scope).run({
      input: {
        subscription_id: id,
      },
    });

    res.json(result);
  } catch (error) {
    req.scope.resolve('logger').error('Failed to cancel subscription:', error);
    return res.status(500).json({
      message: 'Failed to cancel subscription',
      error: error.message,
    });
  }
};
