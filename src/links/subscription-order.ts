import { defineLink } from '@medusajs/framework/utils';
import OrderModule from '@medusajs/medusa/order';

import SubscriptionModule from '../modules/subscriptions';

export default defineLink(SubscriptionModule.linkable.subscription, OrderModule.linkable.order);
