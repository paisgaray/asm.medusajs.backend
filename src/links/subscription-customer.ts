import CustomerModule from '@medusajs/customer';
import { defineLink } from '@medusajs/framework/utils';

import SubscriptionModule from '../modules/subscriptions';

export default defineLink(
  { linkable: SubscriptionModule.linkable.subscription, isList: true },
  CustomerModule.linkable.customer,
);
