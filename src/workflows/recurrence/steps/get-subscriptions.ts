import { CustomerDTO, InferTypeOf } from '@medusajs/framework/types';
import { Modules } from '@medusajs/framework/utils';
import { StepResponse, createStep } from '@medusajs/framework/workflows-sdk';

import { SUBSCRIPTION_MODULE, SubscriptionProvider } from '../../../modules/subscriptions';
import { Subscription } from '../../../modules/subscriptions/models/subscription';
import SubscriptionModuleService from '../../../modules/subscriptions/service';

type Subscription = InferTypeOf<typeof Subscription> & { customer: CustomerDTO };

export const fetchGPSubscriptionStep = createStep(
  'fetch-gp-subscriptions',
  async (_, { container }): Promise<StepResponse<{ subscriptions: Subscription[] }>> => {
    const subscriptionService = container.resolve<SubscriptionModuleService>(SUBSCRIPTION_MODULE);

    const subscriptions = (await subscriptionService.listSubscriptions(
      { provider_id: SubscriptionProvider.GLOBAL_PAYMENTS },
      { relations: [Modules.CUSTOMER] },
    )) as Subscription[];

    return new StepResponse({ subscriptions });
  },
);
