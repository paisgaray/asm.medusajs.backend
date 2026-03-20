import { model } from '@medusajs/framework/utils';

import { CustomBundle } from './custom-bundle';
import { CustomItemOverride } from './custom-item-override';

export const CustomItem = model.define('custom_item', {
  id: model.id().primaryKey(),
  type: model.enum(['single', 'bundle']).default('single'),
  quantity: model.number().default(1),
  item_price: model.number().default(0),
  product_snapshot: model.json(),
  custom_bundle: model.belongsTo(() => CustomBundle, { mappedBy: 'items' }).nullable(),
  overrides: model.hasMany(() => CustomItemOverride, { mappedBy: 'custom_item' }),
});
