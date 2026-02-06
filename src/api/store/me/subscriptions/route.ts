import { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';

import SubscriptionModuleService from '../../../../modules/subscriptions/service';

/**
 * GET /store/me/subscriptions
 * List all subscriptions for the authenticated customer
 */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const subscriptionService = req.scope.resolve('subscriptions') as SubscriptionModuleService;
  const customerId = req.user?.userId;

  if (!customerId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const subscriptions = await subscriptionService.listSubscriptions(
    { customer_id: customerId },
    {
      relations: ['items'],
      order: { created_at: 'DESC' },
    },
  );

  res.json({ subscriptions });
};
