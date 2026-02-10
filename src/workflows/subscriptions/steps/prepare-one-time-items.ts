import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk';

import SubscriptionModuleService from '../../../modules/subscriptions/service';
import { getsertStripeProductWorkflow } from './getsert-stripe-product';

type PrepareOneTimeItemsStepInput = {
  one_time_product_ids?: Array<{
    product_id: string;
    variant_id: string;
    quantity: number;
  }>;
  currency: string;
};

type OneTimeItem = {
  price_data: {
    currency: string;
    product: string;
    unit_amount: number;
  };
  quantity: number;
};

type CompensationData = {
  one_time_items: OneTimeItem[];
  created_stripe_products: string[];
};

export const prepareOneTimeItemsStep = createStep(
  'prepare-one-time-items',
  async (input: PrepareOneTimeItemsStepInput, { container }) => {
    if (!input.one_time_product_ids || input.one_time_product_ids.length === 0) {
      return new StepResponse({ one_time_items: [] }, { one_time_items: [], created_stripe_products: [] });
    }
    const subscriptionService = container.resolve('subscription') as SubscriptionModuleService;

    const query = container.resolve('query');
    const oneTimeItems: OneTimeItem[] = [];
    const createdStripeProducts: string[] = [];

    for (const item of input.one_time_product_ids) {
      // Get product with price using service
      const productData = await subscriptionService.getProductWithPrice(
        query,
        item.product_id,
        item.variant_id,
        input.currency,
      );

      // Get or create Stripe product for this one-time item
      const { result } = await getsertStripeProductWorkflow(container).run({
        input: {
          product_name: productData.product_title,
          medusa_product_id: productData.product_id,
          metadata: {
            variant_id: productData.variant_id,
          },
        },
      });

      if (result.was_created) {
        createdStripeProducts.push(result.stripe_product_id);
      }

      oneTimeItems.push({
        price_data: {
          currency: input.currency,
          product: result.stripe_product_id,
          unit_amount: Math.round(productData.unit_amount * 100), // Convert to cents
        },
        quantity: item.quantity,
      });
    }

    return new StepResponse(
      { one_time_items: oneTimeItems },
      { one_time_items: oneTimeItems, created_stripe_products: createdStripeProducts },
    );
  },
  async (data, { container }) => {
    if (!data?.created_stripe_products || data.created_stripe_products.length === 0) {
      return;
    }

    // Rollback: delete any Stripe products that were created
    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(process.env.STRIPE_API_KEY!);

    const logger = container.resolve('logger');

    for (const productId of data.created_stripe_products) {
      try {
        await stripe.products.del(productId);
        logger.info(`Rolled back Stripe product: ${productId}`);
      } catch (error: any) {
        logger.error(`Failed to rollback Stripe product ${productId}: ${error.message}`);
      }
    }
  },
);
