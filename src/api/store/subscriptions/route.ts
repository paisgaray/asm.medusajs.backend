import { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';

import SubscriptionModuleService from '../../../modules/subscriptions/service';
import { createSubscriptionWorkflow } from '../../../workflows/subscriptions';

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const subscriptionService = req.scope.resolve('subscriptions') as SubscriptionModuleService;
  const customerId = req.auth_context?.actor_id;

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

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const { bundle_product_id, one_time_items } = req.body as {
    bundle_product_id: string;
    one_time_items?: Array<{
      price_data: {
        currency: string;
        product: string;
        unit_amount: number;
      };
      quantity: number;
    }>;
  };

  const customerId = req.auth_context?.actor_id;

  if (!customerId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  if (!bundle_product_id) {
    return res.status(400).json({ message: 'bundle_product_id is required' });
  }

  try {
    const { result } = await createSubscriptionWorkflow(req.scope).run({
      input: {
        customer_id: customerId,
        bundle_product_id,
        one_time_items,
      },
    });

    res.json({
      subscription: result.subscription,
      client_secret: result.client_secret,
    });
  } catch (error: any) {
    req.scope.resolve('logger').error('Failed to create subscription:', error);
    return res.status(500).json({
      message: 'Failed to create subscription',
      error: error.message,
    });
  }
};
