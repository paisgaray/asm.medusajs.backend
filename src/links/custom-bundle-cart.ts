import { defineLink } from '@medusajs/framework/utils';
import CartModule from '@medusajs/medusa/cart';

import SubscriptionModule from '../modules/subscriptions';

export default defineLink(
  { linkable: SubscriptionModule.linkable.customBundle, isList: true },
  CartModule.linkable.cart,
);
