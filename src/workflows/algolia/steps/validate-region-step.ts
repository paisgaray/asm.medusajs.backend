import { Modules } from '@medusajs/framework/utils';
import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk';

interface ValidateRegionInput {
  region_id?: string;
  currency_code?: string;
}

interface ValidatedRegionOutput {
  region_id: string;
  currency_code: string;
}

export const validateRegionStep = createStep(
  'validate-region-step',
  async (input: ValidateRegionInput, { container }): Promise<StepResponse<ValidatedRegionOutput>> => {
    const regionModuleService = container.resolve(Modules.REGION);

    let finalRegionId = input.region_id;
    let finalCurrencyCode = input.currency_code;

    if (!finalRegionId && !finalCurrencyCode) {
      const regions = await regionModuleService.listRegions({});
      if (!regions || regions.length === 0) {
        throw new Error('No regions configured in the system');
      }
      finalRegionId = regions[0].id;
      finalCurrencyCode = regions[0].currency_code;
    } else if (finalCurrencyCode && !finalRegionId) {
      const regions = await regionModuleService.listRegions({});
      const matchingRegion = regions.find(
        (r: { currency_code: string }) => r.currency_code?.toLowerCase() === finalCurrencyCode.toLowerCase(),
      );
      if (matchingRegion) {
        finalRegionId = matchingRegion.id;
      } else if (regions.length > 0) {
        finalRegionId = regions[0].id;
      }
    } else if (finalRegionId && !finalCurrencyCode) {
      const region = await regionModuleService.retrieveRegion(finalRegionId);
      finalCurrencyCode = region.currency_code;
    }

    if (!finalRegionId || !finalCurrencyCode) {
      throw new Error('Unable to determine region for pricing');
    }

    return new StepResponse({
      region_id: finalRegionId,
      currency_code: finalCurrencyCode,
    });
  },
);
