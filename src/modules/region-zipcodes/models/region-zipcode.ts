import { model } from '@medusajs/framework/utils';

const RegionZipcode = model
  .define('region_zipcode', {
    id: model.id().primaryKey(),
    zipcode: model.text(),
    region_id: model.text(),
  })
  .indexes([
    {
      on: ['region_id'],
      name: 'IDX_region_zipcode_region_id',
    },
    {
      on: ['zipcode'],
      name: 'IDX_region_zipcode_zipcode',
    },
  ]);

export default RegionZipcode;
