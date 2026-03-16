import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework/http';
import { ContainerRegistrationKeys } from '@medusajs/framework/utils';

import { SUBSCRIPTION_MODULE } from '../../../../../../modules/subscriptions';
import SubscriptionModuleService, { SUBSCRIPTION_FIELDS } from '../../../../../../modules/subscriptions/service';

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
  const subscriptionService = req.scope.resolve<SubscriptionModuleService>(SUBSCRIPTION_MODULE);

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
    fields: [...SUBSCRIPTION_FIELDS],
    filters: { id },
  });

  const subscription = subscriptions[0] as Record<string, any> | undefined;

  if (!subscription) {
    return res.status(404).json({ message: 'Subscription not found' });
  }

  await subscriptionService.enrichSubscriptionsWithProducts(query, [subscription]);

  // TODO: migra esse loop como uma função no service do bundled
  for (const customBundle of subscription.custom_bundles) {
    const { data: customBundleItemOverrides } = await query.graph({
      entity: 'custom_item_override',
      fields: ['id', 'custom_item_id', 'product.*'],
      filters: { custom_bundle_id: customBundle.id, expire_date: { $gte: new Date() } },
      pagination: { order: { created_at: 'ASC' } },
    });

    const overrideMap = new Map(customBundleItemOverrides.map((i) => [i.custom_item_id, i]));

    for (const customBundledItem of customBundle.items) {
      const override = overrideMap.get(customBundledItem.id);
      if (override) customBundledItem.product = override.product;
    }
  }

  res.json({ subscription });
};
