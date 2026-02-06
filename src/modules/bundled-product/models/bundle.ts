import { model } from '@medusajs/framework/utils';

import { BundleItem } from './bundle-item';

export const Bundle = model.define('bundle', {
  id: model.id().primaryKey(),
  title: model.text(),
  details: model.text().nullable(),
  subscription_price: model.bigNumber().nullable(),
  currency: model.text().default('usd'),
  items: model.hasMany(() => BundleItem, {
    mappedBy: 'bundle',
  }),
});
