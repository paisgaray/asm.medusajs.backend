import { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';

import SubscriptionModuleService from '../../../../../modules/subscriptions/service';
import { cancelSubscriptionWorkflow } from '../../../../../workflows/subscriptions';

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const subscriptionService = req.scope.resolve('subscriptions') as SubscriptionModuleService;
  const customerId = req.auth_context?.actor_id;
  const { id } = req.params;

  if (!customerId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    // Verify ownership
    const subscription = await subscriptionService.retrieveSubscription(id);

    if (subscription.customer_id !== customerId) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const { result } = await cancelSubscriptionWorkflow(req.scope).run({
      input: { subscription_id: id },
    });

    res.json(result);
  } catch (error: any) {
    req.scope.resolve('logger').error('Failed to cancel subscription:', error);
    return res.status(500).json({
      message: 'Failed to cancel subscription',
      error: error.message,
    });
  }
};
