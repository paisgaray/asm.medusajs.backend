import { model } from '@medusajs/framework/utils';

import { Subscription } from './subscription';
import { CustomBundleItem } from './custom-bundle-item';

export const CustomBundle = model.define('custom_bundle', {
  id: model.id().primaryKey(),
  bundle_price: model.number(),
  metadata: model.json().nullable(),
  subscription: model.belongsTo(() => Subscription, {
    mappedBy: 'bundles',
  }),
  items: model.hasMany(() => CustomBundleItem, {
    mappedBy: 'bundle',
  }),
});
