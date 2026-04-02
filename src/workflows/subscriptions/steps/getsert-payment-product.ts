import { createStep, createWorkflow, StepResponse, WorkflowResponse } from '@medusajs/framework/workflows-sdk';
import Stripe from 'stripe';

import { SubscriptionProvider } from '../../../modules/subscriptions';
import { getProviderAdapter } from '../../../modules/subscriptions/adapters';

type GetsertStripeProductInput = {
  payment_provider_id: SubscriptionProvider;
  product_name: string;
  medusa_product_id: string;
  metadata?: Record<string, string>;
};

/**
 * Step: Get or create a Stripe product
 * Searches for existing product by medusa_product_id, creates if not found
 */
export const getsertPaymentProductStep = createStep(
  'getsert-payment-product',
  async (input: GetsertStripeProductInput) => {
    const adapter = getProviderAdapter(input.payment_provider_id);

    const { paymentProductId, wasCreated } = await adapter.getsertPaymentProduct(
      input.product_name,
      input.medusa_product_id,
      input.metadata,
    );

    return new StepResponse(
      { payment_product_id: paymentProductId, was_created: wasCreated },
      { payment_provider_id: input.payment_provider_id, payment_product_id: wasCreated ? paymentProductId : null },
    );
  },
  async (data, { container }) => {
    if (data.payment_provider_id !== SubscriptionProvider.STRIPE || !data?.payment_product_id) return;

    // Rollback: delete the Stripe product if it was created and something fails later
    const stripe = new Stripe(process.env.STRIPE_API_KEY!);

    try {
      await stripe.products.del(data.payment_product_id);
      container.resolve('logger').info(`Rolled back Stripe product: ${data.payment_product_id}`);
    } catch (error: any) {
      container.resolve('logger').error(`Failed to rollback Stripe product: ${error.message}`);
    }
  },
);

/**
 * Workflow: Get or create a Stripe product
 * Can be called from within other steps
 */
export const getsertPaymentProductWorkflow = createWorkflow(
  'getsert-payment-product',
  (input: GetsertStripeProductInput) => {
    const result = getsertPaymentProductStep(input);
    return new WorkflowResponse(result);
  },
);
