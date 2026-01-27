import { MedusaError } from '@medusajs/framework/utils';
import { createStep } from '@medusajs/framework/workflows-sdk';

type EnsureBundleItemStepInput = {
  message: string;
};

export const ensureBundleItemStep = createStep('ensure-bundle-item-step', (input: EnsureBundleItemStepInput) => {
  throw new MedusaError(MedusaError.Types.INVALID_DATA, input.message);
});
