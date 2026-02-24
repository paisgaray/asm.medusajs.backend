import { defineLink } from '@medusajs/framework/utils';
import ProductModule from '@medusajs/medusa/product';

import SubscriptionModule from '../modules/subscriptions';

export default defineLink(
  { linkable: SubscriptionModule.linkable.customBundleItem, isList: true },
  ProductModule.linkable.product,
);
