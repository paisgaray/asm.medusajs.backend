import { model } from '@medusajs/framework/utils';

import { Bundle } from './bundle';

export const BundleItem = model.define('bundle_item', {
  id: model.id().primaryKey(),
  details: model.text().nullable(),
  quantity: model.number().default(1),
  bundle: model.belongsTo(() => Bundle, {
    mappedBy: 'items',
  }),
});
