import { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';

import { REGION_ZIPCODES_MODULE } from '../../../modules/region-zipcodes';
import RegionZipcodesModuleService from '../../../modules/region-zipcodes/service';

type RegionZipcodeFilters = {
  region_id?: string;
  zipcode?: string;
};

// GET - List all region zipcodes with optional filters
export async function GET(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  const regionZipcodesService: RegionZipcodesModuleService = req.scope.resolve(REGION_ZIPCODES_MODULE);

  const { region_id, zipcode, limit, offset } = req.query;

  const filters: RegionZipcodeFilters = {};
  if (region_id) filters.region_id = String(region_id);
  if (zipcode) filters.zipcode = String(zipcode);

  const config: { take?: number; skip?: number } = {};
  if (limit) config.take = parseInt(limit as string);
  if (offset) config.skip = parseInt(offset as string);

  const [regionZipcodes, count] = await regionZipcodesService.listAndCountRegionZipcodes(filters, config);

  res.json({
    region_zipcodes: regionZipcodes,
    count,
    limit: config.take,
    offset: config.skip,
  });
}

// POST - Create a new region zipcode
export async function POST(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  const regionZipcodesService: RegionZipcodesModuleService = req.scope.resolve(REGION_ZIPCODES_MODULE);

  const { zipcode, region_id } = req.body as {
    zipcode: string;
    region_id: string;
  };

  if (!zipcode || !region_id) {
    res.status(400).json({
      message: 'Both zipcode and region_id are required',
    });
    return;
  }

  const regionZipcode = await regionZipcodesService.createRegionZipcodes({
    zipcode,
    region_id,
  });

  res.status(201).json({
    region_zipcode: regionZipcode,
  });
}
