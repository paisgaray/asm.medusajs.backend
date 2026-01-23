import { ContainerRegistrationKeys } from '@medusajs/framework/utils';
import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk';

type ValidateVariantForWishlistStepInput = {
  product_id?: string;
  product_variant_id?: string | null;
};

type VariantValidationResult = {
  variant_id: string | null;
  product_id: string | null;
  valid: boolean;
};

export const validateVariantForWishlistStep = createStep(
  'validate-variant-for-wishlist-step',
  async (input: ValidateVariantForWishlistStepInput, { container }) => {
    const { product_id, product_variant_id } = input;

    if (!product_variant_id || !product_id) {
      const result: VariantValidationResult = {
        variant_id: null,
        product_id: null,
        valid: false,
      };
      return new StepResponse<VariantValidationResult>(result);
    }

    const query = container.resolve(ContainerRegistrationKeys.QUERY);

    try {
      const variantsResult = await query.graph({
        entity: 'product_variant',
        fields: ['id', 'product_id', 'product.id', 'product.status'],
        filters: {
          id: product_variant_id,
        },
      });

      const variants = variantsResult?.data || [];

      if (!variants || variants.length === 0) {
        throw new Error(
          `Variant ${product_variant_id} does not exist. Please verify the variant ID is correct and the product is published.`,
        );
      }

      const variant = variants[0];
      const product = variant.product;

      if (!product) {
        throw new Error(`Product not found for variant ${product_variant_id}`);
      }

      if (product.id !== product_id) {
        throw new Error(
          `Variant ${product_variant_id} does not belong to product ${product_id}. It belongs to product ${product.id}`,
        );
      }

      if (product.status !== 'published') {
        throw new Error(`Product ${product_id} is not published. Status: ${product.status}`);
      }

      const result: VariantValidationResult = {
        variant_id: variant.id,
        product_id: product.id,
        valid: true,
      };
      return new StepResponse<VariantValidationResult>(result);
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to validate variant');
    }
  },
);
