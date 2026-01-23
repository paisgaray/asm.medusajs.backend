import { ContainerRegistrationKeys } from '@medusajs/framework/utils';
import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk';

type ValidateBundleForWishlistStepInput = {
  bundle_id?: string | null;
};

type BundleValidationResult = {
  bundle_id: string | null;
  valid: boolean;
};

export const validateBundleForWishlistStep = createStep(
  'validate-bundle-for-wishlist-step',
  async (input: ValidateBundleForWishlistStepInput, { container }) => {
    const { bundle_id } = input;

    if (!bundle_id) {
      const result: BundleValidationResult = {
        bundle_id: null,
        valid: false,
      };
      return new StepResponse<BundleValidationResult>(result);
    }

    const query = container.resolve(ContainerRegistrationKeys.QUERY);

    try {
      const bundleResult = await query.graph({
        entity: 'bundle',
        fields: ['id', 'title'],
        filters: {
          id: bundle_id,
        },
      });

      const bundles = bundleResult?.data || [];

      if (!bundles || bundles.length === 0) {
        throw new Error(`Bundle ${bundle_id} does not exist`);
      }

      const result: BundleValidationResult = {
        bundle_id: bundles[0].id,
        valid: true,
      };
      return new StepResponse<BundleValidationResult>(result);
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(`Bundle ${bundle_id} does not exist`);
    }
  },
);
