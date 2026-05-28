import { container } from '@medusajs/framework';
import { CustomerDTO, ICustomerModuleService } from '@medusajs/framework/types';
import Stripe from 'stripe';

import { SubscriptionProvider } from '../types';
import { PreparePaymentMethodDataContext, SubscriptionProviderAdapter } from './provider-adapter';
import { CreatePaymentSubscriptionStepInput } from './type';

export class StripeSubscriptionAdapter implements SubscriptionProviderAdapter {
  private stripe: Stripe;
  private readonly payment_provider_id: SubscriptionProvider;

  constructor() {
    this.stripe = new Stripe(process.env.STRIPE_API_KEY!);
    this.payment_provider_id = SubscriptionProvider.STRIPE;
  }

  private getRecurring(frequency: string): Stripe.SubscriptionUpdateParams.Item.PriceData.Recurring {
    switch (frequency) {
      case 'weekly':
        return { interval: 'week' };
      case 'biweekly':
        return { interval: 'week', interval_count: 2 };
      default:
        return { interval: 'month' };
    }
  }

  async skipNextPayment(providerSubscriptionId: string, resumesAt: Date): Promise<void> {
    await this.stripe.subscriptions.update(providerSubscriptionId, {
      pause_collection: {
        behavior: 'void',
        resumes_at: Math.floor(resumesAt.getTime() / 1000),
      },
    });
  }

  async rollbackSkip(providerSubscriptionId: string): Promise<void> {
    await this.stripe.subscriptions.update(providerSubscriptionId, {
      pause_collection: null,
    });
  }

  async updatePrice(
    providerSubscriptionId: string,
    newAmountInCents: number,
    currency: string,
    frequency: string,
  ): Promise<void> {
    const sub = await this.stripe.subscriptions.retrieve(providerSubscriptionId);
    const item = sub.items.data[0];
    const productId = typeof item.price.product === 'string' ? item.price.product : item.price.product.id;

    await this.stripe.subscriptions.update(providerSubscriptionId, {
      items: [
        {
          id: item.id,
          price_data: {
            currency,
            product: productId,
            unit_amount: newAmountInCents,
            recurring: this.getRecurring(frequency),
          },
        },
      ],
      proration_behavior: 'none',
    });
  }

  async rollbackUpdatePrice(
    providerSubscriptionId: string,
    previousAmountInCents: number,
    currency: string,
    frequency: string,
  ): Promise<void> {
    await this.updatePrice(providerSubscriptionId, previousAmountInCents, currency, frequency);
  }

  private async recreateSubscription(
    providerSubscriptionId: string,
    frequency: string,
    nextBillingDate: Date,
  ): Promise<string> {
    const sub = await this.stripe.subscriptions.retrieve(providerSubscriptionId, {
      expand: ['default_payment_method'],
    });
    const item = sub.items.data[0];
    const productId = typeof item.price.product === 'string' ? item.price.product : item.price.product.id;
    const paymentMethodId =
      typeof sub.default_payment_method === 'string' ? sub.default_payment_method : sub.default_payment_method?.id;

    await this.stripe.subscriptions.cancel(providerSubscriptionId);

    const newSub = await this.stripe.subscriptions.create({
      customer: typeof sub.customer === 'string' ? sub.customer : sub.customer.id,
      default_payment_method: paymentMethodId,
      items: [
        {
          price_data: {
            currency: sub.currency,
            product: productId,
            unit_amount: item.price.unit_amount ?? 0,
            recurring: this.getRecurring(frequency),
          },
        },
      ],
      billing_cycle_anchor: Math.floor(nextBillingDate.getTime() / 1000),
      proration_behavior: 'none',
    });

    return newSub.id;
  }

  async updateFrequency(
    providerSubscriptionId: string,
    newFrequency: string,
    newNextBillingDate: Date,
  ): Promise<{ new_provider_subscription_id: string }> {
    const sub = await this.stripe.subscriptions.retrieve(providerSubscriptionId);
    const item = sub.items.data[0];
    const targetRecurring = this.getRecurring(newFrequency);
    const currentRecurring = item.price.recurring;

    // If the interval already matches, nothing to do in Stripe.
    const isSameInterval =
      currentRecurring?.interval === targetRecurring.interval &&
      (currentRecurring?.interval_count ?? 1) === (targetRecurring.interval_count ?? 1);

    if (isSameInterval) {
      return { new_provider_subscription_id: providerSubscriptionId };
    }

    const newSubId = await this.recreateSubscription(providerSubscriptionId, newFrequency, newNextBillingDate);
    return { new_provider_subscription_id: newSubId };
  }

  async rollbackUpdateFrequency(
    newProviderSubscriptionId: string,
    previousFrequency: string,
    previousNextBillingDate: Date,
  ): Promise<{ new_provider_subscription_id: string }> {
    const newSubId = await this.recreateSubscription(
      newProviderSubscriptionId,
      previousFrequency,
      previousNextBillingDate,
    );
    return { new_provider_subscription_id: newSubId };
  }

  async updateDeliveryDate(
    providerSubscriptionId: string,
    frequency: string,
    newNextBillingDate: Date,
  ): Promise<{ new_provider_subscription_id: string }> {
    const newSubId = await this.recreateSubscription(providerSubscriptionId, frequency, newNextBillingDate);
    return { new_provider_subscription_id: newSubId };
  }

  async rollbackUpdateDeliveryDate(
    newProviderSubscriptionId: string,
    frequency: string,
    previousNextBillingDate: Date,
  ): Promise<{ new_provider_subscription_id: string }> {
    const newSubId = await this.recreateSubscription(newProviderSubscriptionId, frequency, previousNextBillingDate);
    return { new_provider_subscription_id: newSubId };
  }

  async changeSubscriptionPaymentMethod(providerSubscriptionId: string, paymentMethodId: string): Promise<void> {
    await this.stripe.subscriptions.update(providerSubscriptionId, {
      default_payment_method: paymentMethodId,
    });
  }

  async detachPaymentMethod(paymentMethodId: string): Promise<void> {
    await this.stripe.paymentMethods.detach(paymentMethodId);
  }

  async updatePaymentMethod(
    paymentMethodId: string,
    params: { billing_details?: Record<string, unknown>; metadata?: Record<string, unknown> },
  ): Promise<void> {
    await this.stripe.paymentMethods.update(paymentMethodId, {
      ...(params.billing_details && {
        billing_details: params.billing_details as Stripe.PaymentMethodUpdateParams['billing_details'],
      }),
      ...(params.metadata && { metadata: params.metadata as Stripe.Emptyable<Stripe.MetadataParam> }),
    });
  }

  async getOrCreatePaymentCustomer(customer_id: string): Promise<{
    paymentCustomerId: string;
    wasCreated: boolean;
    customer: CustomerDTO;
  }> {
    const customerQuery = container.resolve('query');

    const {
      data: [customer],
    } = await customerQuery.graph({
      entity: 'customer',
      filters: { id: customer_id },
      fields: ['email', 'metadata'],
    });

    if (!customer) throw new Error(`Customer ${customer_id} not found`);

    let paymentProviderId = customer?.metadata?.payment_provider_id;
    let paymentCustomerId = customer?.metadata?.payment_customer_id;
    let wasCreated = false;

    if (paymentProviderId !== this.payment_provider_id || !paymentCustomerId) {
      const stripeCustomer = await this.stripe.customers.create({
        email: customer.email,
        metadata: { medusa_customer_id: customer_id },
      });

      paymentProviderId = this.payment_provider_id;
      paymentCustomerId = stripeCustomer.id;
      wasCreated = true;

      const customerService = container.resolve('customer') as ICustomerModuleService;
      await customerService.updateCustomers(customer_id, {
        metadata: {
          ...customer.metadata,
          payment_provider_id: paymentProviderId,
          payment_customer_id: paymentCustomerId,
        },
      });

      container.resolve('logger').info(`Created new Stripe customer: ${paymentCustomerId}`);
    } else {
      container.resolve('logger').info(`Reusing existing Stripe customer: ${paymentCustomerId}`);
    }

    return { paymentCustomerId, wasCreated, customer };
  }

  async attachPaymentMethod(
    payment_method_id: string,
    payment_customer_id: string,
  ): Promise<{
    payment_method_id: string;
    paymentMethod: {
      brand: string;
      last4: string;
      exp_month: number;
      exp_year: number;
    };
  }> {
    const logger = container.resolve('logger');

    logger.info(`Attaching payment method ${payment_method_id} to customer ${payment_customer_id}`);

    // Check if payment method is already attached to this customer
    const paymentMethod = await this.stripe.paymentMethods.retrieve(payment_method_id);

    if (paymentMethod.customer === payment_customer_id) {
      logger.info(`Payment method ${payment_method_id} is already attached to customer ${payment_customer_id}`);
    } else if (paymentMethod.customer && paymentMethod.customer !== payment_customer_id) {
      throw new Error(
        `Payment method ${payment_method_id} is already attached to a different customer: ${paymentMethod.customer}`,
      );
    } else {
      // Attach payment method to customer
      await this.stripe.paymentMethods.attach(payment_method_id, {
        customer: payment_customer_id,
      });
      logger.info(`Payment method ${payment_method_id} attached to customer`);
    }

    // Set as default payment method
    await this.stripe.customers.update(payment_customer_id, {
      invoice_settings: { default_payment_method: payment_method_id },
    });

    logger.info(`Payment method ${payment_method_id} set as default`);

    return {
      payment_method_id,
      paymentMethod: {
        last4: paymentMethod.card?.last4 ?? null,
        brand: paymentMethod.card?.brand?.toUpperCase() ?? null,
        exp_month: paymentMethod.card?.exp_month ?? null,
        exp_year: paymentMethod.card?.exp_year ?? null,
      },
    };
  }

  async getsertPaymentProduct(
    product_name: string,
    medusa_product_id: string,
    metadata?: Record<string, string>,
  ): Promise<{
    paymentProductId: string;
    wasCreated: boolean;
  }> {
    const logger = container.resolve('logger');

    // Search for existing product by metadata
    const existingProducts = await this.stripe.products.search({
      query: `metadata['medusa_product_id']:'${medusa_product_id}'`,
      limit: 1,
    });

    let paymentProductId: string;
    let wasCreated = false;

    if (existingProducts.data.length > 0) {
      // Use existing product
      paymentProductId = existingProducts.data[0].id;
      logger.info(`Reusing existing Stripe product: ${paymentProductId} for ${medusa_product_id}`);
    } else {
      // Create new Stripe product
      const stripeProduct = await this.stripe.products.create({
        name: product_name,
        metadata: { medusa_product_id, ...metadata },
      });
      paymentProductId = stripeProduct.id;
      wasCreated = true;
      logger.info(`Created new Stripe product: ${paymentProductId} for ${medusa_product_id}`);
    }

    return { paymentProductId, wasCreated };
  }

  persistPaymentMethodLocally(
    _currentAccountHolderData: Record<string, unknown>,
    _paymentMethodId: string,
    _paymentMethodData: Record<string, unknown>,
  ): null {
    // Stripe stores payment methods externally — no local persistence needed.
    return null;
  }

  removePaymentMethodLocally(_currentAccountHolderData: Record<string, unknown>, _paymentMethodId: string): null {
    // Stripe manages payment methods externally via detachPaymentMethod.
    return null;
  }

  async preparePaymentMethodData(
    token: string,
    _context?: PreparePaymentMethodDataContext,
  ): Promise<Record<string, unknown>> {
    return {
      payment_method: token,
      confirm: true,
      usage: 'off_session',
      automatic_payment_methods: { enabled: true, allow_redirects: 'never' },
    };
  }

  async createPaymentSubscription(input: CreatePaymentSubscriptionStepInput): Promise<{
    subscription: { id: string; status: string };
    periodStart: number;
    periodEnd: number;
  }> {
    let recurring: Stripe.SubscriptionCreateParams.Item.PriceData.Recurring;
    switch (input.metadata?.frequency) {
      case 'weekly':
        recurring = { interval: 'week' };
        break;
      case 'biweekly':
        recurring = { interval_count: 2, interval: 'week' };
        break;
      default:
        recurring = { interval: 'month' };
    }

    // Create Stripe subscription
    const subscriptionParams: Stripe.SubscriptionCreateParams = {
      customer: input.payment_customer_id,
      items: [
        {
          price_data: {
            currency: input.currency,
            product: input.payment_product_id,
            unit_amount: input.subscription_price,
            recurring,
          },
        },
      ],
      payment_behavior: 'error_if_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent'],
    };

    if (input.skip_first_charge) {
      // Checkout already charged for the first period.
      // Backdate the subscription start to now (in seconds), so the next billing naturally occurs ~1 month from now
      const now = Math.floor(Date.now() / 1000) - 10; // Subtract 10 seconds to ensure it's in the past and doesn't cause errors
      subscriptionParams.backdate_start_date = now;
      // The first invoice will be created but won't charge since billing already happened
      subscriptionParams.proration_behavior = 'none';
    }

    const stripeSubscription = await this.stripe.subscriptions.create(subscriptionParams);

    // Extract client secret
    // let clientSecret: string | null = null;
    // if (stripeSubscription.latest_invoice) {
    //   const invoice: any =
    //     typeof stripeSubscription.latest_invoice === 'string'
    //       ? await stripe.invoices.retrieve(stripeSubscription.latest_invoice, { expand: ['payment_intent'] })
    //       : stripeSubscription.latest_invoice;

    //   if (invoice.payment_intent && typeof invoice.payment_intent !== 'string') {
    //     clientSecret = invoice.payment_intent.client_secret || null;
    //   }
    // }

    // console.log('clientSecret', clientSecret);

    // In Stripe API 2026-01-28.clover+, current_period_start/end moved from
    // the subscription root to each subscription item.
    const firstItem = stripeSubscription.items.data[0];
    const periodStart = firstItem?.current_period_start;
    const periodEnd = firstItem?.current_period_end;

    return {
      subscription: { id: stripeSubscription.id, status: stripeSubscription.status },
      periodStart,
      periodEnd,
    };
  }
}
