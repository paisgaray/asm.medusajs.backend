import { ICustomerModuleService } from '@medusajs/framework/types';
import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk';
import Stripe from 'stripe';

type GetOrCreateStripeCustomerStepInput = {
  customer_id: string;
};

export const getOrCreateStripeCustomerStep = createStep(
  'get-or-create-stripe-customer',
  async (input: GetOrCreateStripeCustomerStepInput, { container }) => {
    const stripe = new Stripe(process.env.STRIPE_API_KEY!, { apiVersion: '2022-11-15' });

    // Get Medusa customer
    const customerQuery = container.resolve('query');
    const {
      data: [customer],
    } = await customerQuery.graph({
      entity: 'customer',
      filters: { id: input.customer_id },
      fields: ['email', 'metadata'],
    });

    if (!customer) {
      throw new Error(`Customer ${input.customer_id} not found`);
    }

    let stripeCustomerId = customer?.metadata?.stripe_customer_id;
    let wasCreated = false;

    if (!stripeCustomerId) {
      const stripeCustomer = await stripe.customers.create({
        email: customer.email,
        metadata: {
          medusa_customer_id: input.customer_id,
        },
      });
      stripeCustomerId = stripeCustomer.id;
      wasCreated = true;

      // Update customer metadata
      const customerService = container.resolve('customer') as ICustomerModuleService;
      await customerService.updateCustomers(
        input.customer_id,
        {
          metadata: {
            ...customer.metadata,
            stripe_customer_id: stripeCustomerId,
          },
        },
        {},
      );

      container.resolve('logger').info(`Created new Stripe customer: ${stripeCustomerId}`);
    } else {
      container.resolve('logger').info(`Reusing existing Stripe customer: ${stripeCustomerId}`);
    }

    return new StepResponse(
      { stripe_customer_id: stripeCustomerId },
      {
        stripe_customer_id: wasCreated ? stripeCustomerId : null,
        customer_id: input.customer_id,
        original_metadata: customer.metadata,
      },
    );
  },
  async (data, { container }) => {
    if (!data?.stripe_customer_id) {
      return;
    }

    // Rollback: remove the stripe_customer_id from customer metadata
    const customerService = container.resolve('customer') as ICustomerModuleService;

    try {
      await customerService.updateCustomers(
        data.customer_id,
        {
          metadata: data.original_metadata,
        },
        {},
      );
      container.resolve('logger').info(`Rolled back Stripe customer metadata for ${data.customer_id}`);
    } catch (error: any) {
      container.resolve('logger').error(`Failed to rollback customer metadata: ${error.message}`);
    }
  },
);
