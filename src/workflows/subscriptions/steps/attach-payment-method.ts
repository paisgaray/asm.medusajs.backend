import { StepResponse, createStep } from '@medusajs/framework/workflows-sdk';
import Stripe from 'stripe';

type AttachPaymentMethodInput = {
  payment_method_id: string;
  stripe_customer_id: string;
};

/**
 * Attaches a payment method to a Stripe customer and sets it as default
 */
export const attachPaymentMethodStep = createStep(
  'attach-payment-method',
  async ({ payment_method_id, stripe_customer_id }: AttachPaymentMethodInput, { container }) => {
    const logger = container.resolve('logger');
    const stripe = new Stripe(process.env.STRIPE_API_KEY!);

    logger.info(`Attaching payment method ${payment_method_id} to customer ${stripe_customer_id}`);

    // Attach payment method to customer
    await stripe.paymentMethods.attach(payment_method_id, {
      customer: stripe_customer_id,
    });

    // Set as default payment method
    await stripe.customers.update(stripe_customer_id, {
      invoice_settings: {
        default_payment_method: payment_method_id,
      },
    });

    logger.info(`Payment method ${payment_method_id} attached and set as default`);

    return new StepResponse({
      success: true,
    });
  },
);
