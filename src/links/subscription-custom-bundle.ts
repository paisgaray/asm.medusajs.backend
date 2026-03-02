import { defineLink } from '@medusajs/framework/utils';

import BundledProductModule from '../modules/bundled-product';
import SubscriptionModule from '../modules/subscriptions';

export default defineLink(SubscriptionModule.linkable.subscription, {
  linkable: BundledProductModule.linkable.customBundle,
  isList: true,
});
