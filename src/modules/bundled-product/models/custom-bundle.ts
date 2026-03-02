import { model } from '@medusajs/framework/utils';

import { CustomItem } from './custom-item';

export const CustomBundle = model.define('custom_bundle', {
  id: model.id().primaryKey(),
  bundle_id: model.text(),
  bundle_price: model.number(),
  metadata: model.json().nullable(),
  items: model.hasMany(() => CustomItem, {
    mappedBy: 'bundle',
  }),
});
