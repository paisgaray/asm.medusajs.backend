import { ContainerRegistrationKeys } from '@medusajs/framework/utils';
import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk';

import { findSubscriptionVariant } from '../../../utils/resolve-subscription-price';

type ValidateSubscriptionProductStepInput = {
  bundle_product_id: string;
};

export const validateSubscriptionProductStep = createStep(
  'validate-subscription-product',
  async (input: ValidateSubscriptionProductStepInput, { container }) => {
    const query = container.resolve(ContainerRegistrationKeys.QUERY);

    // Query product with its linked bundle, variants, and prices in one query
    const {
      data: [product],
    } = await query.graph({
      entity: 'product',
      filters: { id: input.bundle_product_id },
      fields: [
        'id',
        'title',
        'variants.*',
        'variants.prices.*',
        'variants.options.*',
        'variants.options.option.*',
        'bundle.id',
        'bundle.subscription_price',
        'bundle.currency',
      ],
    });

    if (!product) {
      throw new Error(`Product with ID ${input.bundle_product_id} not found`);
    }

    if (!product.bundle) {
      throw new Error(`Product ${input.bundle_product_id} is not linked to a bundle`);
    }

    // Get price from the subscription variant (or first variant as fallback)
    const variant = findSubscriptionVariant((product.variants as any[]) ?? []);
    if (!variant?.prices?.length) {
      throw new Error(`Product ${input.bundle_product_id} has no prices configured`);
    }

    const price = variant.prices[0];
    const subscriptionPrice = Math.round((price.amount ?? 0) * 100);
    const currency = price.currency_code || 'eur';

    return new StepResponse({
      bundle: product.bundle,
      product_title: product.title,
      subscription_price: subscriptionPrice,
      currency,
    });
  },
);
