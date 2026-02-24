import { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';

/**
 * GET /store/me/subscriptions
 * List all subscriptions for the authenticated customer
 */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const query = req.scope.resolve('query');
  const customerId = req.user?.userId;

  if (!customerId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  // Query subscriptions with customer link
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
      'next_billing_date',
      'payment_last4',
      'payment_brand',
      'payment_exp_month',
      'payment_exp_year',
      'metadata',
      'created_at',
      'updated_at',
      'bundles.*',
      'bundles.items.*',
      'bundles.product.*',
      'items.*',
    ],
    filters: {
      customer: {
        id: customerId,
      },
    },
    pagination: {
      order: { created_at: 'DESC' },
    },
  });

  res.json({ subscriptions });
};
