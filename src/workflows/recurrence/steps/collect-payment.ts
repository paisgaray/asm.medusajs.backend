import { CustomerDTO, InferTypeOf } from '@medusajs/framework/types';
import { StepResponse, createStep } from '@medusajs/framework/workflows-sdk';
import axios from 'axios';
import crypto from 'node:crypto';
import R from 'ramda';

import subscriptions, { SUBSCRIPTION_MODULE } from '../../../modules/subscriptions';
import { INTERVAL_DAYS } from '../../../modules/subscriptions/constants/interval-days';
import { Subscription } from '../../../modules/subscriptions/models/subscription';
import SubscriptionModuleService from '../../../modules/subscriptions/service';

type Subscription = InferTypeOf<typeof Subscription> & { customer: CustomerDTO };
type CollectPaymentOutput = {
  time_created: Date;
  amount: string;
  status: string;
};

const executeCollectPayment = async (input: Subscription): Promise<CollectPaymentOutput> => {
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

  const { data: transaction } = await axios.post<CollectPaymentOutput>(
    `${process.env.GLOBAL_PAYMENT_BASE_URL}/transactions`,
    {
      account_name: 'asmglobalpayments',
      type: 'SALE',
      channel: 'CNP',
      capture_mode: 'AUTO',
      currency: 'EUR',
      country: 'ES',
      initiator: 'MERCHANT',
      amount: input.subscription_price,
      reference: input.id,
      stored_credential: { model: 'RECURRING', reason: 'INCREMENTAL', sequence: 'SUBSEQUENT' },
      payment_method: {
        entry_mode: 'ECOM',
        name: input.customer.first_name,
        id: input.provider_payment_method_id,
        card: {
          brand_reference: input.metadata.payment_brand_reference,
        },
      },
    },
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `${data.type} ${data.token}`,
        Accept: 'application/json',
        'X-GP-Version': '2021-03-22',
      },
    },
  );

  return transaction;
};

export const collectPaymentStep = createStep('collect-payment', async (input: Subscription[], { container }) => {
  const subscriptionService: SubscriptionModuleService = container.resolve(SUBSCRIPTION_MODULE);

  const chucksSubscriptions = R.splitEvery(10, input);

  for (const subscriptions of chucksSubscriptions) {
    const results = await Promise.allSettled<CollectPaymentOutput>(
      subscriptions.map(async (i) => executeCollectPayment(i)),
    );

    for (const [index, result] of results.entries()) {
      const subscription = subscriptions[index];

      if (result.status === 'fulfilled') {
        await subscriptionService.createSubscriptionInvoices({
          subscription_id: subscription.id,
          current_subscription_billing_date: subscription.next_billing_date,
          billing_date: result.value.time_created,
          amount: Number(result.value.amount),
          metadata: result.value,
        });

        const intervalDays = INTERVAL_DAYS[subscription.frequency];
        const next_billing_date = new Date(
          subscription.next_billing_date.getTime() + intervalDays * 24 * 60 * 60 * 1000,
        );

        await subscriptionService.updateSubscriptions({
          id: subscription.id,
          next_billing_date,
        });
      }

      if (result.status === 'rejected') {
        await subscriptionService.updateSubscriptions([{ id: subscription.id, status: 'paused' }]);
      }
    }
  }

  return new StepResponse({ subscriptions });
});
