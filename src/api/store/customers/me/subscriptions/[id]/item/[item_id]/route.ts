import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework/http';

import { removeSubscriptionItemWorkflow } from '../../../../../../../../workflows/subscriptions/remove-subscription-item';
import {
  updateSubscriptionItemQuantityWorkflow,
  UpdateSubscriptionItemQuantityWorkflowInput,
} from '../../../../../../../../workflows/subscriptions/update-subscription-item-quantity';
import type { UpdateSubscriptionItemSchema } from './validators';

async function getOwnedSubscription(req: AuthenticatedMedusaRequest, subscriptionId: string) {
  const query = req.scope.resolve('query');
  const customerId = req.auth_context?.actor_id;

  if (!customerId) return null;

  const {
    data: [subscription],
  } = await query.graph({
    entity: 'subscription',
    fields: ['id', 'customer.*'],
    filters: { id: subscriptionId },
  });

  if (!subscription || subscription.customer?.id !== customerId) return null;

  return subscription;
}

export const PATCH = async (req: AuthenticatedMedusaRequest<UpdateSubscriptionItemSchema>, res: MedusaResponse) => {
  const { id, item_id } = req.params;

  const subscription = await getOwnedSubscription(req, id);
  if (!subscription) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  try {
    const { result } = await updateSubscriptionItemQuantityWorkflow(req.scope).run({
      input: {
        subscription_id: id,
        item_id,
        quantity: req.validatedBody.quantity,
      } as UpdateSubscriptionItemQuantityWorkflowInput,
    });

    res.status(200).json(result);
  } catch (error) {
    req.scope.resolve('logger').error('Failed to update subscription item quantity:', error);
    return res.status(500).json({
      message: 'Failed to update subscription item quantity',
      error: error.message,
    });
  }
};

export const DELETE = async (req: AuthenticatedMedusaRequest, res: MedusaResponse) => {
  const { id, item_id } = req.params;

  const subscription = await getOwnedSubscription(req, id);
  if (!subscription) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  try {
    const { result } = await removeSubscriptionItemWorkflow(req.scope).run({
      input: { subscription_id: id, item_id },
    });

    res.status(200).json(result);
  } catch (error) {
    req.scope.resolve('logger').error('Failed to remove subscription item:', error);
    return res.status(500).json({
      message: 'Failed to remove subscription item',
      error: error.message,
    });
  }
};
