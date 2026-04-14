import { CustomerDTO, InferTypeOf } from '@medusajs/framework/types';
import { ContainerRegistrationKeys } from '@medusajs/framework/utils';
import { StepResponse, createStep } from '@medusajs/framework/workflows-sdk';

import { SubscriptionProvider } from '../../../modules/subscriptions';
import { Subscription } from '../../../modules/subscriptions/models/subscription';

type Subscription = InferTypeOf<typeof Subscription> & { customer: CustomerDTO };

export const fetchGPSubscriptionStep = createStep(
  'fetch-gp-subscriptions',
  async (_, { container }): Promise<StepResponse<{ subscriptions: Subscription[] }>> => {
    const query = container.resolve(ContainerRegistrationKeys.QUERY);

    const { data: subscriptions } = await query.graph({
      entity: 'subscription',
      fields: ['*', 'customer.*'],
      filters: {
        provider_id: SubscriptionProvider.GLOBAL_PAYMENTS,
      },
    });

    return new StepResponse({ subscriptions });
  },
);
