import { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';

import { REGION_ZIPCODES_MODULE } from '../../../../modules/region-zipcodes';
import RegionZipcodesModuleService from '../../../../modules/region-zipcodes/service';

// GET - Retrieve a specific region zipcode by ID
export async function GET(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  const regionZipcodesService: RegionZipcodesModuleService = req.scope.resolve(REGION_ZIPCODES_MODULE);

  const { id } = req.params;

  try {
    const regionZipcode = await regionZipcodesService.retrieveRegionZipcode(id);

    res.json({
      region_zipcode: regionZipcode,
    });
  } catch (error) {
    res.status(404).json({
      message: `Region zipcode with id ${id} not found`,
    });
  }
}

// PUT - Update a specific region zipcode by ID
export async function POST(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  const regionZipcodesService: RegionZipcodesModuleService = req.scope.resolve(REGION_ZIPCODES_MODULE);

  const { id } = req.params;
  const { zipcode, region_id } = req.body as {
    zipcode?: string;
    region_id?: string;
  };

  if (!zipcode && !region_id) {
    res.status(400).json({
      message: 'At least one field (zipcode or region_id) is required to update',
    });
    return;
  }

  try {
    const updateData: { zipcode?: string; region_id?: string } = {};
    if (zipcode !== undefined) updateData.zipcode = zipcode;
    if (region_id !== undefined) updateData.region_id = region_id;

    const regionZipcode = await regionZipcodesService.updateRegionZipcodes({
      id,
      ...updateData,
    });

    res.json({
      region_zipcode: regionZipcode,
    });
  } catch (error) {
    res.status(404).json({
      message: `Region zipcode with id ${id} not found`,
    });
  }
}

// DELETE - Delete a specific region zipcode by ID
export async function DELETE(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  const regionZipcodesService: RegionZipcodesModuleService = req.scope.resolve(REGION_ZIPCODES_MODULE);

  const { id } = req.params;

  try {
    await regionZipcodesService.deleteRegionZipcodes(id);

    res.json({
      id,
      deleted: true,
    });
  } catch (error) {
    res.status(404).json({
      message: `Region zipcode with id ${id} not found`,
    });
  }
}
