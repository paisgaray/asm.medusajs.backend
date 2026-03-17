import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework/http';
import { ContainerRegistrationKeys } from '@medusajs/framework/utils';

import { SUBSCRIPTION_MODULE } from '../../../../../modules/subscriptions';
import SubscriptionModuleService, { SUBSCRIPTION_FIELDS } from '../../../../../modules/subscriptions/service';

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
  const subscriptionService = req.scope.resolve<SubscriptionModuleService>(SUBSCRIPTION_MODULE);

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
    fields: [...SUBSCRIPTION_FIELDS],
    filters: { id: subscriptionIds },
    pagination: { order: { created_at: 'DESC' } },
  });

  await subscriptionService.enrichSubscriptionsWithProducts(query, subscriptions as Record<string, any>[]);

  res.json({ subscriptions });
};
