/* eslint-disable prettier/prettier */
import { container } from '@medusajs/framework';
import { CustomerDTO, ICustomerModuleService } from '@medusajs/framework/types';
import axios from 'axios';
import crypto from 'node:crypto';

import { INTERVAL_DAYS } from '../constants/interval-days';
import { SubscriptionFrequency, SubscriptionProvider } from '../types';
import { PreparePaymentMethodDataContext, SubscriptionProviderAdapter } from './provider-adapter';
import { CreatePaymentSubscriptionStepInput } from './type';

const GLOBAL_PAYMENTS_CARD_PROVIDER = 'global-payments';

type StoredGlobalPaymentsCard = {
  card_token?: string;
  brand?: string | null;
  last4?: string | null;
  exp_month?: string | number | null;
  exp_year?: string | number | null;
};

type PaymentsApiService = {
  listPaymentCards(provider: string, customerId: string, isActive?: boolean): Promise<StoredGlobalPaymentsCard[]>;
};

const toNullableNumber = (value: string | number | null | undefined): number | null => {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const parsed = Number(value);

  return Number.isNaN(parsed) ? null : parsed;
};

export class GPSubscriptionAdapter implements SubscriptionProviderAdapter {
  private readonly payment_provider_id: SubscriptionProvider;

  constructor() {
    this.payment_provider_id = SubscriptionProvider.GLOBAL_PAYMENTS;
  }

  private getBaseUrl(): string {
    const configuredBaseUrl = process.env.GLOBAL_PAYMENT_BASE_URL?.trim();

    if (configuredBaseUrl) {
      return configuredBaseUrl.replace(/\/+$/, '');
    }

    throw new Error('Global Payments base URL is not configured');
  }

  private async getStoredPaymentMethodData(
    customerId: string,
    paymentMethodId: string,
  ): Promise<Record<string, unknown> | undefined> {
    try {
      const paymentsApiService = container.resolve<PaymentsApiService>('payment_payments_api');
      const storedCards = await paymentsApiService.listPaymentCards(GLOBAL_PAYMENTS_CARD_PROVIDER, customerId);
      const storedCard = storedCards.find((card) => card.card_token === paymentMethodId);

      if (!storedCard) {
        return undefined;
      }

      return {
        token: paymentMethodId,
        brand: storedCard.brand ?? null,
        last4: storedCard.last4 ?? null,
        exp_month: toNullableNumber(storedCard.exp_month),
        exp_year: toNullableNumber(storedCard.exp_year),
      };
    } catch {
      return undefined;
    }
  }

  private async getCredential(): Promise<{ type: string; token: string }> {
    const baseUrl = this.getBaseUrl();
    const nonce = new Date().toISOString();
    const secret = crypto.createHash('sha512').update(`${nonce}${process.env.GLOBAL_PAYMENTS_APP_KEY}`).digest('hex');

    const { data } = await axios.post<{ type: string; token: string }>(
      `${baseUrl}/accesstoken`,
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

  async skipNextPayment(): Promise<void> { }

  async rollbackSkip(): Promise<void> { }

  async detachPaymentMethod(): Promise<void> { }

  async updatePaymentMethod(): Promise<void> { }

  async updatePrice(): Promise<void> { }

  async rollbackUpdatePrice(): Promise<void> { }

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

  async changeSubscriptionPaymentMethod(): Promise<void> { }

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
    const baseUrl = this.getBaseUrl();
    const { type, token } = await this.getCredential();

    const { data } = await axios.get<{
      card: { brand: string; number_last4: string; expiry_month: string; expiry_year: string };
    }>(`${baseUrl}/payment-methods/${payment_method_id}`, {
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

  removePaymentMethodLocally(
    currentAccountHolderData: Record<string, unknown>,
    paymentMethodId: string,
  ): Record<string, unknown> | null {
    const existingMethods = (currentAccountHolderData?.payment_methods as Array<Record<string, unknown>>) ?? [];
    if (!existingMethods.some((m) => m.id === paymentMethodId)) {
      return null;
    }
    return {
      ...currentAccountHolderData,
      payment_methods: existingMethods.filter((m) => m.id !== paymentMethodId),
    };
  }

  persistPaymentMethodLocally(
    currentAccountHolderData: Record<string, unknown>,
    paymentMethodId: string,
    paymentMethodData: Record<string, unknown>,
  ): Record<string, unknown> {
    const existingMethods = (currentAccountHolderData?.payment_methods as Array<Record<string, unknown>>) ?? [];
    if (existingMethods.some((m) => m.id === paymentMethodId)) {
      return null;
    }
    return {
      ...currentAccountHolderData,
      payment_methods: [...existingMethods, { id: paymentMethodId, ...paymentMethodData }],
    };
  }

  async preparePaymentMethodData(
    token: string,
    context?: PreparePaymentMethodDataContext,
  ): Promise<Record<string, unknown>> {
    if (context?.customer_id) {
      const storedPaymentMethodData = await this.getStoredPaymentMethodData(context.customer_id, token);

      if (storedPaymentMethodData) {
        return storedPaymentMethodData;
      }
    }

    const baseUrl = this.getBaseUrl();
    const { type, token: accessToken } = await this.getCredential();

    await axios.patch(
      `${baseUrl}/payment-methods/${token}`,
      { usage_mode: 'MULTIPLE' },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `${type} ${accessToken}`,
          'X-GP-Version': '2021-03-22',
        },
      },
    );

    const { paymentMethod } = await this.attachPaymentMethod(token, '');

    return {
      token,
      brand: paymentMethod.brand,
      last4: paymentMethod.last4,
      exp_month: paymentMethod.exp_month,
      exp_year: paymentMethod.exp_year,
    };
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
