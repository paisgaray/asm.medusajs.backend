import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework/http';

import {
  updateSubscriptionPaymentMethodWorkflow,
  UpdateSubscriptionPaymentMethodWorkflowInput,
} from '../../../../../../../workflows/subscriptions/update-subscription-payment-method';
import { UpdateSubscriptionPaymentMethodSchema } from './validators';

/**
 * POST /store/customers/me/subscriptions/:id/payment-method
 * Update the payment method for a specific subscription.
 *
 * Body:
 *   payment_method_id  — Stripe pm_xxx obtained via stripe.createPaymentMethod() on the frontend
 *   set_as_default     — If true, also sets the PM as the Stripe customer-level default (all subscriptions).
 *                        If false (default), only updates this subscription's default PM.
 */
export const POST = async (
  req: AuthenticatedMedusaRequest<UpdateSubscriptionPaymentMethodSchema>,
  res: MedusaResponse,
) => {
  const customerId = req.auth_context?.actor_id;

  if (!customerId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const { id } = req.params;
  const query = req.scope.resolve('query');

  // Verify the subscription belongs to this customer
  const { data: subscriptions } = await query.graph({
    entity: 'subscription',
    fields: ['id', 'customer.*'],
    filters: { id },
  });

  const subscription = subscriptions[0];

  if (!subscription || subscription.customer?.id !== customerId) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  try {
    const { result } = await updateSubscriptionPaymentMethodWorkflow(req.scope).run({
      input: {
        ...req.validatedBody,
        id: subscription.id,
      } as UpdateSubscriptionPaymentMethodWorkflowInput,
    });

    res.json(result);
  } catch (error) {
    req.scope.resolve('logger').error('Failed to update subscription payment method:', error);
    return res.status(500).json({
      message: 'Failed to update subscription payment method',
      error: error.message,
    });
  }
};
