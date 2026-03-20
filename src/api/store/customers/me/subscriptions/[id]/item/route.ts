import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework/http';

import {
  addItemToSubscriptionWorkflow,
  AddItemToSubscriptionWorkflowInput,
} from '../../../../../../../workflows/subscriptions/add-item-to-subscription';
import type { AddSubscriptionItemSchema } from './validators';

export const POST = async (req: AuthenticatedMedusaRequest<AddSubscriptionItemSchema>, res: MedusaResponse) => {
  const query = req.scope.resolve('query');
  const customerId = req.auth_context?.actor_id;
  const { id } = req.params;

  if (!customerId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const {
    data: [subscription],
  } = await query.graph({
    entity: 'subscription',
    fields: ['id', 'customer.*'],
    filters: { id },
  });

  if (!subscription || subscription.customer?.id !== customerId) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  try {
    const { result } = await addItemToSubscriptionWorkflow(req.scope).run({
      input: {
        subscription_id: id,
        items: req.validatedBody.items,
      } as AddItemToSubscriptionWorkflowInput,
    });

    res.status(201).json(result);
  } catch (error) {
    req.scope.resolve('logger').error('Failed to add item to subscription:', error);
    return res.status(500).json({
      message: 'Failed to add item to subscription',
      error: error.message,
    });
  }
};
