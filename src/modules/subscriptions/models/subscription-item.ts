import { model } from '@medusajs/framework/utils';

import { Subscription } from './subscription';

export const SubscriptionItem = model.define('subscription_item', {
  id: model.id().primaryKey(),
  product_id: model.text(),
  variant_id: model.text(),
  quantity: model.number().default(1),
  product_snapshot: model.json(), // Stores product details at subscription time
  subscription: model.belongsTo(() => Subscription, {
    mappedBy: 'items',
  }),
});
