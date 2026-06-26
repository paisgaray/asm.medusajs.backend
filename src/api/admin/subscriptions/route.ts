import { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';
import { ContainerRegistrationKeys } from '@medusajs/framework/utils';

import { SubscriptionProvider } from '../../../modules/subscriptions';
import { SUBSCRIPTION_ADMIN_LIST_FIELDS } from '../../../modules/subscriptions/service';
import { formatPrice } from '../../../utils/resolve-subscription-price';

function resolveSubscriptionProvider(providerId: string | null | undefined) {
  return providerId ?? SubscriptionProvider.STRIPE;
}

function mapSubscriptionRow(sub: Record<string, unknown>) {
  const providerId = resolveSubscriptionProvider(sub.provider_id as string | null);

  return {
    ...sub,
    provider_id: providerId,
    provider: providerId,
    calculated_price: formatPrice(sub.subscription_price as number),
  };
}

function buildBaseFilters(query: Record<string, unknown>) {
  const { customer_id, status } = query;
  const filters: Record<string, unknown> = {};

  if (customer_id && typeof customer_id === 'string') {
    filters.customer = { id: customer_id };
  }
  if (status && typeof status === 'string') {
    filters.status = status;
  }

  return filters;
}

const LIST_FIELDS = [
  ...SUBSCRIPTION_ADMIN_LIST_FIELDS,
  'customer.id',
  'customer.email',
  'customer.first_name',
  'customer.last_name',
] as const;

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);

  const { customer_id, status, provider, limit = 50, offset = 0 } = req.query;
  const filters = buildBaseFilters({ customer_id, status });
  const providerFilter = typeof provider === 'string' ? provider : undefined;
  const numericLimit = Number(limit);
  const numericOffset = Number(offset);

  // Legacy rows may have null provider_id — treat as Stripe when filtering
  if (providerFilter === SubscriptionProvider.STRIPE) {
    const { data: subscriptions } = await query.graph({
      entity: 'subscription',
      fields: [...LIST_FIELDS],
      filters,
      pagination: { order: { created_at: 'DESC' } },
    });

    const mapped = (subscriptions as Record<string, unknown>[])
      .map(mapSubscriptionRow)
      .filter((sub) => sub.provider_id === SubscriptionProvider.STRIPE);

    res.json({
      subscriptions: mapped.slice(numericOffset, numericOffset + numericLimit),
      count: mapped.length,
      limit: numericLimit,
      offset: numericOffset,
    });
    return;
  }

  if (providerFilter && providerFilter !== 'all') {
    filters.provider_id = providerFilter;
  }

  const { data: subscriptions } = await query.graph({
    entity: 'subscription',
    fields: [...LIST_FIELDS],
    filters,
    pagination: {
      skip: numericOffset,
      take: numericLimit,
      order: { created_at: 'DESC' },
    },
  });

  const { data: allSubscriptions } = await query.graph({
    entity: 'subscription',
    fields: ['id'],
    filters,
  });

  res.json({
    subscriptions: (subscriptions as Record<string, unknown>[]).map(mapSubscriptionRow),
    count: allSubscriptions.length,
    limit: numericLimit,
    offset: numericOffset,
  });
};
