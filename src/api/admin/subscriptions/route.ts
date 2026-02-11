import { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';

import SubscriptionModuleService from '../../../modules/subscriptions/service';
import { createSubscriptionWorkflow } from '../../../workflows/subscriptions';

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const subscriptionService = req.scope.resolve('subscriptions') as SubscriptionModuleService;

  const { customer_id, status, limit = 50, offset = 0 } = req.query;

  const filters: { customer_id?: string; status?: string } = {};
  if (customer_id && typeof customer_id === 'string') filters.customer_id = customer_id;
  if (status && typeof status === 'string') filters.status = status;

  const subscriptions = await subscriptionService.listSubscriptions(filters, {
    relations: ['items'],
    skip: Number(offset),
    take: Number(limit),
    order: { created_at: 'DESC' },
  });

  const count = await subscriptionService.listSubscriptions(filters);

  res.json({
    subscriptions,
    count: count.length,
    limit: Number(limit),
    offset: Number(offset),
  });
};

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const { customer_id, bundle_product_id } = req.body as {
    customer_id: string;
    bundle_product_id: string;
  };

  if (!customer_id || !bundle_product_id) {
    return res.status(400).json({ message: 'customer_id and bundle_product_id are required' });
  }

  try {
    const { result } = await createSubscriptionWorkflow(req.scope).run({
      input: {
        customer_id,
        bundle_product_id,
      },
    });

    res.json({
      subscription: result.subscription,
    });
  } catch (error) {
    req.scope.resolve('logger').error('Failed to create subscription:', error);
    return res.status(500).json({
      message: 'Failed to create subscription',
      error: error.message,
    });
  }
};
