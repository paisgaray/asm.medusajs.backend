import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk';
import { ContainerRegistrationKeys } from '@medusajs/framework/utils';

type ValidateVariantStepInput = {
  product_id: string;
  variant_id?: string | null;
};

export const validateVariantStep = createStep(
  'validate-variant-step',
  async (input: ValidateVariantStepInput, { container }) => {
    const { product_id, variant_id } = input;

    if (!variant_id) {
      throw new Error('Variant ID is required');
    }

    const query = container.resolve(ContainerRegistrationKeys.QUERY);

    try {
      const variantsResult = await query.graph({
        entity: 'product_variant',
        fields: ['id', 'product_id', 'product.id', 'product.status'],
        filters: {
          id: variant_id,
        },
      });

      const variants = variantsResult?.data || [];

      if (variants && variants.length > 0) {
        const variant = variants[0];
        const product = variant.product;

        if (product && product.status === 'published') {
          if (variant.product_id === product_id) {
            return new StepResponse({
              variant_id: variant.id,
              product_id: product.id,
              fallback: false,
            });
          }
        }
      }

      const allVariantsResult = await query.graph({
        entity: 'product_variant',
        fields: ['id', 'product_id', 'product.id', 'product.status'],
        filters: {
          product_id: product_id,
        },
      });

      const allVariants = allVariantsResult?.data || [];

      if (!allVariants || allVariants.length === 0) {
        if (variants && variants.length > 0) {
          const variant = variants[0];
          const product = variant.product;
          if (product && product.status === 'published') {
            return new StepResponse({
              variant_id: variant.id,
              product_id: product.id,
              original_variant_id: variant_id,
              fallback: true,
            });
          }
        }
        throw new Error(
          `Product ${product_id} has no variants or variant ${variant_id} does not exist`,
        );
      }

      const publishedVariant = allVariants.find(
        (v: { product?: { status?: string } }) =>
          v.product?.status === 'published',
      );

      if (!publishedVariant) {
        if (variants && variants.length > 0) {
          const variant = variants[0];
          const product = variant.product;
          if (product && product.status === 'published') {
            return new StepResponse({
              variant_id: variant.id,
              product_id: product.id,
              original_variant_id: variant_id,
              fallback: true,
            });
          }
        }
        throw new Error(
          `Product ${product_id} is not published or has no published variants`,
        );
      }

      return new StepResponse({
        variant_id: publishedVariant.id,
        product_id: product_id,
        original_variant_id: variant_id,
        fallback: true,
      });
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to validate variant');
    }
  },
);

