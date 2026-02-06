import { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';

import SubscriptionModuleService from '../../../../modules/subscriptions/service';

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const subscriptionService = req.scope.resolve('subscriptions') as SubscriptionModuleService;
  const { id } = req.params;

  try {
    const subscription = await subscriptionService.retrieveSubscription(id, {
      relations: ['items'],
    });

    res.json({ subscription });
  } catch (error) {
    req.scope.resolve('logger').error('Failed to retrieve subscription:', error);
    return res.status(404).json({ message: 'Subscription not found' });
  }
};

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const subscriptionService = req.scope.resolve('subscriptions') as SubscriptionModuleService;
  const { id } = req.params;
  const { status, metadata } = req.body as {
    status?: string;
    metadata?: Record<string, unknown>;
  };

  try {
    const updateData: { status?: string; metadata?: Record<string, unknown> } = {};
    if (status) updateData.status = status;
    if (metadata) updateData.metadata = metadata;

    await subscriptionService.updateSubscriptions([
      {
        id,
        ...updateData,
      },
    ]);

    const updatedSubscription = await subscriptionService.retrieveSubscription(id, {
      relations: ['items'],
    });

    res.json({ subscription: updatedSubscription });
  } catch (error) {
    req.scope.resolve('logger').error('Failed to update subscription:', error);
    return res.status(500).json({
      message: 'Failed to update subscription',
      error: error.message,
    });
  }
};
