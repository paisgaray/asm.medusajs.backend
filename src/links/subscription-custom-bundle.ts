import { defineLink } from '@medusajs/framework/utils';

import BundledProductModule from '../modules/bundled-product';
import SubscriptionModule from '../modules/subscriptions';

export default defineLink(
  { linkable: SubscriptionModule.linkable.subscription, isList: true },
  BundledProductModule.linkable.customBundle,
);
