import CustomerModule from '@medusajs/customer';
import { defineLink } from '@medusajs/framework/utils';

import SubscriptionModule from '../modules/subscriptions';

export default defineLink(SubscriptionModule.linkable.subscription, CustomerModule.linkable.customer);
