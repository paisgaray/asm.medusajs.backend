import { model } from '@medusajs/framework/utils';

import { Bundle } from './bundle';

export const BundleItem = model.define('bundle_item', {
  id: model.id().primaryKey(),
  details: model.text().nullable(),
  bundle: model.belongsTo(() => Bundle, { mappedBy: 'items' }),
});
