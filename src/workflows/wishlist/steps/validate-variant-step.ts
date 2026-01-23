import { ContainerRegistrationKeys } from '@medusajs/framework/utils';
import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk';

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
      const productResult = await query.graph({
        entity: 'product',
        fields: ['id', 'status', 'variants.id', 'variants.product_id'],
        filters: {
          id: product_id,
        },
      });

      const products = productResult?.data || [];

      if (!products || products.length === 0) {
        throw new Error(`Product ${product_id} does not exist`);
      }

      const product = products[0];

      if (product.status !== 'published') {
        throw new Error(`Product ${product_id} is not published. Current status: ${product.status}`);
      }

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
        const variantProduct = variant.product;

        if (variantProduct && variantProduct.status === 'published') {
          if (variant.product_id === product_id) {
            return new StepResponse({
              variant_id: variant.id,
              product_id: variantProduct.id,
              fallback: false,
            });
          }
          throw new Error(`Variant ${variant_id} belongs to product ${variant.product_id}, not ${product_id}`);
        }
      }

      const allVariantsResult = await query.graph({
        entity: 'product_variant',
        fields: ['id', 'product_id', 'product.id', 'product.status'],
        filters: {
          product_id,
        },
      });

      const allVariants = allVariantsResult?.data || [];

      if (!allVariants || allVariants.length === 0) {
        throw new Error(`Product ${product_id} has no variants`);
      }

      const publishedVariant = allVariants.find((v) => {
        const vProduct = v.product;
        return vProduct && vProduct.status === 'published';
      });

      if (!publishedVariant) {
        throw new Error(`Product ${product_id} has no published variants`);
      }

      return new StepResponse({
        variant_id: publishedVariant.id,
        product_id,
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
