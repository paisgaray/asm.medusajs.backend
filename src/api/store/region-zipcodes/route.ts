import { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';

import { REGION_ZIPCODES_MODULE } from '../../../modules/region-zipcodes';
import RegionZipcodesModuleService from '../../../modules/region-zipcodes/service';

// GET - Find region by zipcode (public endpoint)
export async function GET(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  const regionZipcodesService: RegionZipcodesModuleService = req.scope.resolve(REGION_ZIPCODES_MODULE);

  const { zipcode } = req.query;

  if (!zipcode) {
    res.status(400).json({
      message: 'Zipcode parameter is required',
    });
    return;
  }

  try {
    const regionZipcodes = await regionZipcodesService.listRegionZipcodes({ zipcode: zipcode as string }, { take: 1 });

    if (regionZipcodes && regionZipcodes.length > 0) {
      res.json({
        region_zipcode: regionZipcodes[0],
      });
    } else {
      res.status(404).json({
        message: 'No region found for this zipcode',
      });
    }
  } catch (error) {
    console.error('Error fetching region by zipcode:', error);
    res.status(500).json({
      message: 'Failed to fetch region',
    });
  }
}
