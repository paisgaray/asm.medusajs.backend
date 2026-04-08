import { createWorkflow, WorkflowResponse } from '@medusajs/framework/workflows-sdk';
// import { acquireLockStep, releaseLockStep } from '@medusajs/medusa/core-flows';

import { collectPaymentStep } from '../steps/collect-payment';
import { fetchGPSubscriptionStep } from '../steps/get-subscriptions';

export const executeRecurence = createWorkflow('execute-recurrence', () => {
  const { subscriptions } = fetchGPSubscriptionStep();

  // acquireLockStep({ key: 'ID', timeout: 10, ttl: 10 });

  collectPaymentStep(subscriptions);

  // releaseLockStep({ key: 'ID' });

  return new WorkflowResponse({});
});
