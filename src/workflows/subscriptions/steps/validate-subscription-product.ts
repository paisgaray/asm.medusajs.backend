import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk';

type ValidateSubscriptionProductStepInput = {
  bundle_product_id: string;
};

export const validateSubscriptionProductStep = createStep(
  'validate-subscription-product',
  async (input: ValidateSubscriptionProductStepInput, { container }) => {
    const query = container.resolve('query');

    // Query product with its linked bundle and price
    const {
      data: [product],
    } = await query.graph({
      entity: 'product',
      filters: { id: input.bundle_product_id },
      fields: ['id', 'title', 'variants.*', 'variants.calculated_price.*', 'bundle.*', 'bundle.items.*'],
    });

    if (!product) {
      throw new Error(`Product with ID ${input.bundle_product_id} not found`);
    }

    if (!product.bundle) {
      throw new Error(`Product ${input.bundle_product_id} is not linked to a bundle`);
    }

    // Get price from the product's default variant
    const defaultVariant = product.variants?.[0];
    if (!defaultVariant?.calculated_price?.calculated_amount) {
      throw new Error(`Product ${input.bundle_product_id} has no price configured`);
    }

    const subscriptionPrice = defaultVariant.calculated_price.calculated_amount;
    const currency = defaultVariant.calculated_price.currency_code || 'eur';

    return new StepResponse({
      bundle: product.bundle,
      subscription_price: subscriptionPrice,
      currency,
    });
  },
);
