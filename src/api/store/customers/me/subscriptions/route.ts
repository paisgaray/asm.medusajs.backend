import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework/http';
import { ContainerRegistrationKeys } from '@medusajs/framework/utils';

/**
 * GET /store/customers/me/subscriptions
 * List all subscriptions for the authenticated customer
 */
export const GET = async (req: AuthenticatedMedusaRequest, res: MedusaResponse) => {
  const customerId = req.auth_context?.actor_id;

  if (!customerId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);

  // Resolve subscription IDs via the subscription_customer link entity
  const { data: linkEntries } = await query.graph({
    entity: 'subscription_customer',
    fields: ['subscription_id'],
    filters: { customer_id: customerId },
  });

  const subscriptionIds = linkEntries.map((l) => l.subscription_id).filter((id): id is string => !!id);

  if (!subscriptionIds.length) {
    return res.json({ subscriptions: [] });
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
      'next_billing_date',
      'payment_last4',
      'payment_brand',
      'payment_exp_month',
      'payment_exp_year',
      'metadata',
      'created_at',
      'updated_at',
      'custom_bundle.*',
      'custom_bundle.items.*',
      'custom_bundle.items.product.*',
      'custom_bundle.items.product_variant.*',
      'custom_bundle.product.*',
    ],
    filters: { id: subscriptionIds },
    pagination: {
      order: { created_at: 'DESC' },
    },
  });

  res.json({ subscriptions });
};
