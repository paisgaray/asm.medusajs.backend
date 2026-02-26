import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework/http';
import { ContainerRegistrationKeys } from '@medusajs/framework/utils';

/**
 * GET /store/customers/me/subscriptions/:id
 * Retrieve a single subscription for the authenticated customer
 */
export const GET = async (req: AuthenticatedMedusaRequest, res: MedusaResponse) => {
  const customerId = req.auth_context?.actor_id;

  if (!customerId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const { id } = req.params;
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);

  // Verify the subscription belongs to this customer via the link entity
  const { data: linkEntries } = await query.graph({
    entity: 'subscription_customer',
    fields: ['subscription_id'],
    filters: { customer_id: customerId, subscription_id: id },
  });

  if (!linkEntries.length) {
    return res.status(404).json({ message: 'Subscription not found' });
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
    filters: { id },
  });

  const subscription = subscriptions[0];

  if (!subscription) {
    return res.status(404).json({ message: 'Subscription not found' });
  }

  res.json({ subscription });
};
