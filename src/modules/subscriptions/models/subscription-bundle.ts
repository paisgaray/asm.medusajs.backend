import { model } from '@medusajs/framework/utils';

import { Subscription } from './subscription';
import { SubscriptionItem } from './subscription-item';

export const SubscriptionBundle = model.define('subscription_bundle', {
  id: model.id().primaryKey(),
  bundle_price: model.number(),
  metadata: model.json().nullable(), // Stores bundle details at subscription time (title, etc.)
  subscription: model.belongsTo(() => Subscription, {
    mappedBy: 'bundles',
  }),
  items: model.hasMany(() => SubscriptionItem, {
    mappedBy: 'bundle',
  }),
});
