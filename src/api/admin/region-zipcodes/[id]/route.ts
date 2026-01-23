import { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';
import { MedusaError } from '@medusajs/framework/utils';

import { REGION_ZIPCODES_MODULE } from '../../../../modules/region-zipcodes';
import RegionZipcodesModuleService from '../../../../modules/region-zipcodes/service';

// GET - Retrieve a specific region zipcode by ID
export async function GET(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  const regionZipcodesService: RegionZipcodesModuleService = req.scope.resolve(REGION_ZIPCODES_MODULE);

  const { id } = req.params;

  try {
    const regionZipcode = await regionZipcodesService.retrieveRegionZipcode(id);

    res.json({ region_zipcode: regionZipcode });
  } catch {
    res.status(404).json({ message: `Region zipcode with id ${id} not found` });
  }
}

// PUT - Update a specific region zipcode by ID
export async function PUT(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  const regionZipcodesService: RegionZipcodesModuleService = req.scope.resolve(REGION_ZIPCODES_MODULE);

  const { id } = req.params;

  const [regionZipcode] = await regionZipcodesService.listRegionZipcodes(id);

  if (!regionZipcode) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, `Region zipcode with id ${id} not found`);
  }

  const { zipcode, region_id } = req.validatedBody as { zipcode?: string; region_id?: string };

  if (!zipcode && !region_id) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      'At least one field (zipcode or region_id) is required to update',
    );
  }

  const updateData: { zipcode?: string; region_id?: string } = {};
  if (zipcode !== undefined) updateData.zipcode = zipcode;
  if (region_id !== undefined) updateData.region_id = region_id;

  const regionZipcodeUpdated = await regionZipcodesService.updateRegionZipcodes({
    id,
    ...updateData,
  });

  res.json({
    region_zipcode: regionZipcodeUpdated,
  });
}

// DELETE - Delete a specific region zipcode by ID
export async function DELETE(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  const regionZipcodesService: RegionZipcodesModuleService = req.scope.resolve(REGION_ZIPCODES_MODULE);

  const { id } = req.params;

  const [regionZipcode] = await regionZipcodesService.listRegionZipcodes({ id });

  if (!regionZipcode) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, `Region zipcode with id ${id} not found`);
  }

  await regionZipcodesService.deleteRegionZipcodes(id);

  res.json({
    id,
    deleted: true,
  });
}
