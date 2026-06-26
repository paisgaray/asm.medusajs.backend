import { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';
import { ContainerRegistrationKeys } from '@medusajs/framework/utils';

import { SUBSCRIPTION_MODULE, SubscriptionProvider } from '../../../../modules/subscriptions';
import SubscriptionModuleService, {
  SUBSCRIPTION_ADMIN_LIST_FIELDS,
} from '../../../../modules/subscriptions/service';
import { formatPrice } from '../../../../utils/resolve-subscription-price';
import { cancelSubscriptionWorkflow } from '../../../../workflows/subscriptions';

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

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);
  const { id } = req.params;

  const { data: subscriptions } = await query.graph({
    entity: 'subscription',
    fields: [
      ...SUBSCRIPTION_ADMIN_LIST_FIELDS,
      'customer.id',
      'customer.email',
      'customer.first_name',
      'customer.last_name',
    ],
    filters: { id },
  });

  const subscription = subscriptions[0] as Record<string, unknown> | undefined;

  if (!subscription) {
    return res.status(404).json({ message: 'Subscription not found' });
  }

  res.json({ subscription: mapSubscriptionRow(subscription) });
};

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const subscriptionService = req.scope.resolve<SubscriptionModuleService>(SUBSCRIPTION_MODULE);
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);
  const { id } = req.params;
  const { status, metadata } = req.body as {
    status?: string;
    metadata?: Record<string, unknown>;
  };

  try {
    const updateData: { status?: string; metadata?: Record<string, unknown> } = {};
    if (status) updateData.status = status;
    if (metadata) updateData.metadata = metadata;

    if (!Object.keys(updateData).length) {
      return res.status(400).json({ message: 'status or metadata is required' });
    }

    await subscriptionService.updateSubscriptions([
      {
        id,
        ...updateData,
      },
    ]);

    const { data: subscriptions } = await query.graph({
      entity: 'subscription',
      fields: [...SUBSCRIPTION_ADMIN_LIST_FIELDS],
      filters: { id },
    });

    const subscription = subscriptions[0] as Record<string, unknown>;

    res.json({ subscription: mapSubscriptionRow(subscription) });
  } catch (error) {
    req.scope.resolve('logger').error('Failed to update subscription:', error);
    return res.status(500).json({
      message: 'Failed to update subscription',
      error: error.message,
    });
  }
};

export const DELETE = async (req: MedusaRequest, res: MedusaResponse) => {
  const subscriptionService = req.scope.resolve<SubscriptionModuleService>(SUBSCRIPTION_MODULE);
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);
  const { id } = req.params;

  try {
    const { data: subscriptions } = await query.graph({
      entity: 'subscription',
      fields: ['id', 'status', 'provider_id'],
      filters: { id },
    });

    const subscription = subscriptions[0] as {
      id: string;
      status: string;
      provider_id: string | null;
    } | undefined;

    if (!subscription) {
      return res.status(404).json({ message: 'Subscription not found' });
    }

    const providerId = resolveSubscriptionProvider(subscription.provider_id);
    const isCancellable = subscription.status === 'active' || subscription.status === 'paused';

    if (isCancellable && providerId === SubscriptionProvider.STRIPE) {
      await cancelSubscriptionWorkflow(req.scope).run({
        input: { subscription_id: id },
      });
    } else if (isCancellable) {
      await subscriptionService.updateSubscriptions([{ id, status: 'cancelled' }]);
    }

    await subscriptionService.deleteSubscriptions([id]);

    res.json({ id, deleted: true });
  } catch (error) {
    req.scope.resolve('logger').error('Failed to delete subscription:', error);
    return res.status(500).json({
      message: 'Failed to delete subscription',
      error: error.message,
    });
  }
};
