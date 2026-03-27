import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk';

import { SUBSCRIPTION_MODULE, SubscriptionFrequency } from '../../../modules/subscriptions';
import { getProviderAdapter } from '../../../modules/subscriptions/adapters';
import SubscriptionModuleService from '../../../modules/subscriptions/service';

type UpdateSubscriptionFrequencyStepInput = {
  id: string;
  frequency: SubscriptionFrequency;
};

type CompensationData = {
  id: string;
  previous_frequency: SubscriptionFrequency;
  previous_next_billing_date: string;
  provider: string;
  new_provider_subscription_id: string;
};

const INTERVAL_DAYS: Record<SubscriptionFrequency, number> = {
  [SubscriptionFrequency.WEEKLY]: 7,
  [SubscriptionFrequency.BIWEEKLY]: 14,
  [SubscriptionFrequency.MONTHLY]: 30,
};

/**
 * Computes the new next billing date based on the target frequency.
 *
 * Rule:
 *   candidate = current_period_start + new_interval_days
 *   if candidate > now  →  new_next_billing = candidate
 *   else                →  new_next_billing = current_period_end (existing next_billing_date)
 *
 * Examples:
 *   weekly→biweekly (change on billing day):  today+14 > today  → today+14
 *   biweekly→weekly, change day 3 of 14:      day0+7=7 > 3      → day 7
 *   biweekly→weekly, change day 10 of 14:     day0+7=7 > 10?    → day 14 (period end)
 */
function computeNewNextBillingDate(
  currentPeriodStart: Date,
  currentPeriodEnd: Date,
  newFrequency: SubscriptionFrequency,
): Date {
  const intervalDays = INTERVAL_DAYS[newFrequency];
  const candidate = new Date(currentPeriodStart.getTime() + intervalDays * 24 * 60 * 60 * 1000);
  return candidate > new Date() ? candidate : currentPeriodEnd;
}

export const updateSubscriptionFrequencyStep = createStep(
  'update-subscription-frequency',
  async (input: UpdateSubscriptionFrequencyStepInput, { container }) => {
    const subscriptionService: SubscriptionModuleService = container.resolve(SUBSCRIPTION_MODULE);

    const existing = await subscriptionService.retrieveSubscription(input.id);
    const previousFrequency = existing.frequency as SubscriptionFrequency;
    const provider = existing.provider;
    const providerSubscriptionId = existing.provider_subscription_id;
    const currentPeriodStart = new Date(existing.current_period_start!);
    const currentPeriodEnd = new Date(existing.next_billing_date!);

    const newNextBillingDate = computeNewNextBillingDate(currentPeriodStart, currentPeriodEnd, input.frequency);

    const adapter = getProviderAdapter(provider);
    const { new_provider_subscription_id } = await adapter.updateFrequency(
      providerSubscriptionId,
      input.frequency,
      newNextBillingDate,
    );

    const newDeliveryDate = new Date(newNextBillingDate.getTime() + 7 * 24 * 60 * 60 * 1000);

    await subscriptionService.updateSubscriptions({
      id: input.id,
      frequency: input.frequency,
      provider_subscription_id: new_provider_subscription_id,
      next_billing_date: newNextBillingDate,
      delivery_date: newDeliveryDate,
    });

    const subscription = await subscriptionService.retrieveSubscription(input.id);

    return new StepResponse(
      { subscription },
      {
        id: input.id,
        previous_frequency: previousFrequency,
        previous_next_billing_date: currentPeriodEnd.toISOString(),
        provider,
        new_provider_subscription_id,
      } satisfies CompensationData,
    );
  },
  async (data: CompensationData, { container }) => {
    if (!data?.new_provider_subscription_id) return;

    const subscriptionService: SubscriptionModuleService = container.resolve(SUBSCRIPTION_MODULE);

    try {
      const adapter = getProviderAdapter(data.provider);
      const { new_provider_subscription_id: restored_id } = await adapter.rollbackUpdateFrequency(
        data.new_provider_subscription_id,
        data.previous_frequency,
        new Date(data.previous_next_billing_date),
      );

      const previousNextBillingDate = new Date(data.previous_next_billing_date);
      const previousDeliveryDate = new Date(previousNextBillingDate.getTime() + 7 * 24 * 60 * 60 * 1000);

      await subscriptionService.updateSubscriptions({
        id: data.id,
        frequency: data.previous_frequency,
        provider_subscription_id: restored_id,
        next_billing_date: previousNextBillingDate,
        delivery_date: previousDeliveryDate,
      });
    } catch (error: any) {
      container.resolve('logger').error(`Failed to rollback frequency update: ${error.message}`);
    }
  },
);

