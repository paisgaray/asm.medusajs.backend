import { model } from '@medusajs/framework/utils';

import { CustomBundle } from './custom-bundle';
import { CustomItem } from './custom-item';

export const CustomItemOverride = model.define('custom_item_override', {
  id: model.id().primaryKey(),
  delivery_date: model.dateTime(),
  custom_bundle: model.belongsTo(() => CustomBundle, { mappedBy: 'itemsOverride' }).nullable(),
  customItem: model.belongsTo(() => CustomItem, { mappedBy: 'overrides' }),
});
