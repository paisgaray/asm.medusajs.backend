import { createStep, createWorkflow, StepResponse, WorkflowResponse } from '@medusajs/framework/workflows-sdk';
import Stripe from 'stripe';

type GetsertStripeProductInput = {
  product_name: string;
  medusa_product_id: string;
  metadata?: Record<string, string>;
};

/**
 * Step: Get or create a Stripe product
 * Searches for existing product by medusa_product_id, creates if not found
 */
export const getsertStripeProductStep = createStep(
  'getsert-stripe-product',
  async (input: GetsertStripeProductInput, { container }) => {
    const stripe = new Stripe(process.env.STRIPE_API_KEY!, { apiVersion: '2022-11-15' });

    const logger = container.resolve('logger');

    // Search for existing product by metadata
    const existingProducts = await stripe.products.search({
      query: `metadata['medusa_product_id']:'${input.medusa_product_id}'`,
      limit: 1,
    });

    let stripeProductId: string;
    let wasCreated = false;

    if (existingProducts.data.length > 0) {
      // Use existing product
      stripeProductId = existingProducts.data[0].id;
      logger.info(`Reusing existing Stripe product: ${stripeProductId} for ${input.medusa_product_id}`);
    } else {
      // Create new Stripe product
      const stripeProduct = await stripe.products.create({
        name: input.product_name,
        metadata: {
          medusa_product_id: input.medusa_product_id,
          ...input.metadata,
        },
      });
      stripeProductId = stripeProduct.id;
      wasCreated = true;
      logger.info(`Created new Stripe product: ${stripeProductId} for ${input.medusa_product_id}`);
    }

    return new StepResponse(
      {
        stripe_product_id: stripeProductId,
        was_created: wasCreated,
      },
      {
        stripe_product_id: wasCreated ? stripeProductId : null,
      },
    );
  },
  async (data, { container }) => {
    if (!data?.stripe_product_id) {
      return;
    }

    // Rollback: delete the Stripe product if it was created and something fails later
    const stripe = new Stripe(process.env.STRIPE_API_KEY!, { apiVersion: '2022-11-15' });

    try {
      await stripe.products.del(data.stripe_product_id);
      container.resolve('logger').info(`Rolled back Stripe product: ${data.stripe_product_id}`);
    } catch (error: any) {
      container.resolve('logger').error(`Failed to rollback Stripe product: ${error.message}`);
    }
  },
);

/**
 * Workflow: Get or create a Stripe product
 * Can be called from within other steps
 */
export const getsertStripeProductWorkflow = createWorkflow(
  'getsert-stripe-product',
  (input: GetsertStripeProductInput) => {
    const result = getsertStripeProductStep(input);
    return new WorkflowResponse(result);
  },
);
