import { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';

import { cancelSubscriptionWorkflow } from '../../../../../workflows/subscriptions';

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const { id } = req.params;

  try {
    const { result } = await cancelSubscriptionWorkflow(req.scope).run({
      input: { subscription_id: id },
    });

    res.json(result);
  } catch (error) {
    req.scope.resolve('logger').error('Failed to cancel subscription:', error);
    return res.status(500).json({
      message: 'Failed to cancel subscription',
      error: error.message,
    });
  }
};
