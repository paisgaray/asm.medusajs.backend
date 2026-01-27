import { MedusaService } from '@medusajs/framework/utils';

import RegionZipcode from './models/region-zipcode';

class RegionZipcodesModuleService extends MedusaService({
  RegionZipcode,
}) {
  // MedusaService automatically generates the following methods:
  // - createRegionZipcodes(data)
  // - retrieveRegionZipcode(id, config)
  // - listRegionZipcodes(filters, config)
  // - listAndCountRegionZipcodes(filters, config)
  // - updateRegionZipcodes(data, sharedContext)
  // - deleteRegionZipcodes(ids, sharedContext)
}

export default RegionZipcodesModuleService;
