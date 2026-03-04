import { model } from '@medusajs/framework/utils';

import { CustomItem } from './custom-item';
import { CustomItemOverride } from './custom-item-override';

export const CustomBundle = model.define('custom_bundle', {
  id: model.id().primaryKey(),
  bundle_id: model.text(),
  metadata: model.json().nullable(),
  items: model.hasMany(() => CustomItem, { mappedBy: 'custom_bundle' }),
  itemsOverride: model.hasMany(() => CustomItemOverride, { mappedBy: 'custom_bundle' }),
});
