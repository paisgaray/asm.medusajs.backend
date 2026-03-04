import { model } from '@medusajs/framework/utils';

import { CustomBundle } from './custom-bundle';
import { CustomItemOverride } from './custom-item-override';

export const CustomItem = model.define('custom_item', {
  id: model.id().primaryKey(),
  type: model.enum(['single', 'bundle']).default('single'),
  product_snapshot: model.json(),
  customBundle: model.belongsTo(() => CustomBundle, { mappedBy: 'items' }).nullable(),
  overrides: model.hasOne(() => CustomItemOverride, { mappedBy: 'customItem' }).nullable(),
});
