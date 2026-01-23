import { Module } from '@medusajs/framework/utils';

import RegionZipcodesModuleService from './service';

export const REGION_ZIPCODES_MODULE = 'region_zipcodes';

export default Module(REGION_ZIPCODES_MODULE, {
  service: RegionZipcodesModuleService,
});
