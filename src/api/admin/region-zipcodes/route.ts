import { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';

import { REGION_ZIPCODES_MODULE } from '../../../modules/region-zipcodes';
import RegionZipcodesModuleService from '../../../modules/region-zipcodes/service';

// GET - List all region zipcodes with optional filters
export async function GET(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  const query = req.scope.resolve('query');

  const { data: regionZipcodes, metadata: { count, take, skip } = {} } = await query.graph({
    entity: REGION_ZIPCODES_MODULE,
    ...req.queryConfig,
    filters: req.filterableFields,
  });

  res.json({
    region_zipcodes: regionZipcodes,
    count: count || 0,
    limit: take || 15,
    offset: skip || 0,
  });
}

// POST - Create a new region zipcode
export async function POST(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  const regionZipcodesService: RegionZipcodesModuleService = req.scope.resolve(REGION_ZIPCODES_MODULE);

  const { zipcode, region_id } = req.validatedBody as { zipcode: string; region_id: string };

  const regionZipcode = await regionZipcodesService.createRegionZipcodes({ zipcode, region_id });

  res.status(201).json({
    region_zipcode: regionZipcode,
  });
}
