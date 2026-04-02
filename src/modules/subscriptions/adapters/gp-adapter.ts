import { container } from '@medusajs/framework';
import { CustomerDTO, ICustomerModuleService } from '@medusajs/framework/types';
import axios from 'axios';
import crypto from 'node:crypto';

import { INTERVAL_DAYS } from '../constants/interval-days';
import { SubscriptionFrequency, SubscriptionProvider } from '../types';
import { SubscriptionProviderAdapter } from './provider-adapter';
import { CreatePaymentSubscriptionStepInput } from './type';

export class GPSubscriptionAdapter implements SubscriptionProviderAdapter {
  private readonly payment_provider_id: SubscriptionProvider;

  constructor() {
    this.payment_provider_id = SubscriptionProvider.GLOBAL_PAYMENTS;
  }

  private async getCredential(): Promise<{ type: string; token: string }> {
    const nonce = new Date().toISOString();
    const secret = crypto.createHash('sha512').update(`${nonce}${process.env.GLOBAL_PAYMENTS_APP_KEY}`).digest('hex');

    const { data } = await axios.post<{ type: string; token: string }>(
      `${process.env.GLOBAL_PAYMENT_BASE_URL}/accesstoken`,
      {
        grant_type: 'client_credentials',
        app_id: process.env.GLOBAL_PAYMENTS_APP_ID,
        secret,
        nonce,
      },
      { headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-GP-Version': '2021-03-22' } },
    );

    return data;
  }

  async skipNextPayment(): Promise<void> {}

  async rollbackSkip(): Promise<void> {}

  async detachPaymentMethod(): Promise<void> {}

  async updatePaymentMethod(): Promise<void> {}

  async updatePrice(): Promise<void> {}

  async rollbackUpdatePrice(): Promise<void> {}

  async pdateFrequency(
    providerSubscriptionId: string,
    newFrequency: string,
    newNextBillingDate: Date,
  ): Promise<{ new_provider_subscription_id: string }> {
    console.log({ providerSubscriptionId, newFrequency, newNextBillingDate });
    return { new_provider_subscription_id: '' };
  }

  async updateFrequency(
    providerSubscriptionId: string,
    newFrequency: string,
    newNextBillingDate: Date,
  ): Promise<{ new_provider_subscription_id: string }> {
    console.log({ providerSubscriptionId, newFrequency, newNextBillingDate });
    return { new_provider_subscription_id: '' };
  }

  async rollbackUpdateFrequency(
    newProviderSubscriptionId: string,
    previousFrequency: string,
    previousNextBillingDate: Date,
  ): Promise<{ new_provider_subscription_id: string }> {
    console.log({ newProviderSubscriptionId, previousFrequency, previousNextBillingDate });
    return { new_provider_subscription_id: '' };
  }

  async updateDeliveryDate(
    providerSubscriptionId: string,
    frequency: string,
    newNextBillingDate: Date,
  ): Promise<{ new_provider_subscription_id: string }> {
    console.log({ providerSubscriptionId, frequency, newNextBillingDate });
    return { new_provider_subscription_id: '' };
  }

  async rollbackUpdateDeliveryDate(
    newProviderSubscriptionId: string,
    frequency: string,
    previousNextBillingDate: Date,
  ): Promise<{ new_provider_subscription_id: string }> {
    console.log({ newProviderSubscriptionId, frequency, previousNextBillingDate });
    return { new_provider_subscription_id: '' };
  }

  async changeSubscriptionPaymentMethod(): Promise<void> {}

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
      paymentProviderId = this.payment_provider_id;
      paymentCustomerId = customer.id;
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
    _: string,
  ): Promise<{
    payment_method_id: string;
    paymentMethod: { brand: string; last4: string; exp_month: number; exp_year: number };
  }> {
    const { type, token } = await this.getCredential();

    const { data } = await axios.get<{
      card: { brand: string; number_last4: string; expiry_month: string; expiry_year: string };
    }>(`${process.env.GLOBAL_PAYMENT_BASE_URL}/payment-methods/${payment_method_id}`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `${type} ${token}`,
        'X-GP-Version': '2021-03-22',
      },
    });

    return {
      payment_method_id,
      paymentMethod: {
        brand: data.card.brand,
        last4: data.card.number_last4.slice(-4),
        exp_month: Number(data.card.expiry_month),
        exp_year: Number(data.card.expiry_year),
      },
    };
  }

  async getsertPaymentProduct(
    product_name: string,
    medusa_product_id: string,
    _: Record<string, string>,
  ): Promise<{ paymentProductId: string; wasCreated: boolean }> {
    return { paymentProductId: null, wasCreated: false };
  }

  async createPaymentSubscription(
    input: CreatePaymentSubscriptionStepInput,
  ): Promise<{ subscription: { id: string; status: string }; periodStart: number; periodEnd: number }> {
    let addDays: number = 0;

    switch (input.metadata.frequency) {
      case 'weekly':
        addDays = INTERVAL_DAYS[SubscriptionFrequency.WEEKLY];
        break;
      case 'biweekly':
        addDays = INTERVAL_DAYS[SubscriptionFrequency.BIWEEKLY];
        break;
      default:
        addDays = INTERVAL_DAYS[SubscriptionFrequency.MONTHLY];
    }

    const periodStart = new Date();
    const periodEnd = new Date(periodStart).setDate(periodStart.getDate() + addDays);

    return {
      subscription: { id: null, status: 'active' },
      periodStart: periodStart.getTime() / 1000,
      periodEnd: periodEnd / 1000,
    };
  }
}
