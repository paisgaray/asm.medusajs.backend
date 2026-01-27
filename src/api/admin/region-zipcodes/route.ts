import { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';
import { IRegionModuleService } from '@medusajs/framework/types';
import { MedusaError, Modules } from '@medusajs/framework/utils';

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
  const regionService: IRegionModuleService = req.scope.resolve(Modules.REGION);

  const { zipcode, region_id } = req.validatedBody as { zipcode: string; region_id: string };

  const [zipcodeExists] = await regionZipcodesService.listRegionZipcodes({ zipcode });

  if (zipcodeExists) {
    const [region] = await regionService.listRegions({ id: zipcodeExists.region_id });

    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Zipcode ${zipcodeExists.zipcode} already exists in the ${region.name} region`,
    );
  }

  const regionZipcode = await regionZipcodesService.createRegionZipcodes({ zipcode, region_id });

  res.status(201).json({
    region_zipcode: regionZipcode,
  });
}
