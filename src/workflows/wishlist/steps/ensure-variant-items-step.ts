import { MedusaError } from '@medusajs/framework/utils';
import { createStep } from '@medusajs/framework/workflows-sdk';

type EnsureVariantItemsStepInput = {
  message: string;
};

export const ensureVariantItemsStep = createStep('ensure-variant-items-step', (input: EnsureVariantItemsStepInput) => {
  throw new MedusaError(MedusaError.Types.INVALID_DATA, input.message);
});
