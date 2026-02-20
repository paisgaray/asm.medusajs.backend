import { model } from '@medusajs/framework/utils';

import { Subscription } from './subscription';
import { SubscriptionBundle } from './subscription-bundle';

export const SubscriptionItem = model.define('subscription_item', {
  id: model.id().primaryKey(),
  type: model.enum(['single', 'bundle']).default('single'),
  quantity: model.number().default(1),
  item_price: model.number(), // Price for this specific item
  product_snapshot: model.json(), // Stores product details at subscription time
  subscription: model.belongsTo(() => Subscription, {
    mappedBy: 'items',
  }),
  bundle: model
    .belongsTo(() => SubscriptionBundle, {
      mappedBy: 'items',
    })
    .nullable(),
});
