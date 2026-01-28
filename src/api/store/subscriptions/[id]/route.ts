import { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';

import SubscriptionModuleService from '../../../../modules/subscriptions/service';

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const subscriptionService = req.scope.resolve('subscriptions') as SubscriptionModuleService;
  const customerId = req.auth_context?.actor_id;
  const { id } = req.params;

  if (!customerId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const subscription = await subscriptionService.retrieveSubscription(id, {
      relations: ['items'],
    });

    // Verify ownership
    if (subscription.customer_id !== customerId) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    res.json({ subscription });
  } catch (error: any) {
    req.scope.resolve('logger').error('Failed to retrieve subscription:', error);
    return res.status(404).json({ message: 'Subscription not found' });
  }
};
