import { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';

import { createSubscriptionWorkflow } from '../../../workflows/subscriptions';

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const query = req.scope.resolve('query');

  const { customer_id, status, limit = 50, offset = 0 } = req.query;

  // Build filters for query
  const filters: any = {};
  if (customer_id && typeof customer_id === 'string') {
    filters.customer = { id: customer_id };
  }
  if (status && typeof status === 'string') {
    filters.status = status;
  }

  const { data: subscriptions } = await query.graph({
    entity: 'subscription',
    fields: [
      'id',
      'status',
      'provider',
      'provider_subscription_id',
      'subscription_price',
      'currency',
      'current_period_start',
      'current_period_end',
      'next_billing_date',
      'metadata',
      'created_at',
      'updated_at',
      'customer.*',
      'bundles.*',
      'bundles.items.*',
      'bundles.product.*',
      'items.*',
    ],
    filters,
    pagination: {
      skip: Number(offset),
      take: Number(limit),
      order: { created_at: 'DESC' },
    },
  });

  // Get count for pagination
  const { data: allSubscriptions } = await query.graph({
    entity: 'subscription',
    fields: ['id'],
    filters,
  });

  res.json({
    subscriptions,
    count: allSubscriptions.length,
    limit: Number(limit),
    offset: Number(offset),
  });
};

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const { customer_id, bundle_product_id, metadata } = req.body as {
    customer_id: string;
    bundle_product_id: string;
    metadata: Record<string, unknown>;
  };

  if (!customer_id || !bundle_product_id) {
    return res.status(400).json({ message: 'customer_id and bundle_product_id are required' });
  }

  try {
    const { result } = await createSubscriptionWorkflow(req.scope).run({
      input: {
        customer_id,
        bundle_product_id,
        metadata,
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
