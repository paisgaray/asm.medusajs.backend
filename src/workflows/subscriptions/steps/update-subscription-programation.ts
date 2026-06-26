import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk';

import { SUBSCRIPTION_MODULE, SubscriptionProvider } from '../../../modules/subscriptions';
import { getProviderAdapter } from '../../../modules/subscriptions/adapters';
import SubscriptionModuleService from '../../../modules/subscriptions/service';

type UpdateSubscriptionProgramationStepInput = {
  id: string;
  delivery_date?: Date | null;
  period?: 'morning' | 'afternoon' | 'evening' | null;
};

type CompensationData = {
  id: string;
  providerId: SubscriptionProvider;
  new_provider_subscription_id: string;
  previous_next_billing_date: string;
  previous_delivery_date: string;
  previous_period: string;
};

export const updateSubscriptionProgramationStep = createStep(
  'update-subscription-programation',
  async (input: UpdateSubscriptionProgramationStepInput, { container }) => {
    const subscriptionService: SubscriptionModuleService = container.resolve(SUBSCRIPTION_MODULE);
    const existing = await subscriptionService.retrieveSubscription(input.id);

    let new_provider_subscription_id = existing.provider_subscription_id;
    let newNextBillingDate: Date | undefined;

    if (input.delivery_date) {
      const deliveryDate = new Date(input.delivery_date);
      // Stripe charges 7 days before delivery
      newNextBillingDate = new Date(deliveryDate.getTime() - 7 * 24 * 60 * 60 * 1000);

      const adapter = getProviderAdapter(existing.provider_id ?? SubscriptionProvider.STRIPE);
      ({ new_provider_subscription_id } = await adapter.updateDeliveryDate(
        existing.provider_subscription_id,
        existing.frequency,
        newNextBillingDate,
      ));
    }

    await subscriptionService.updateSubscriptions({
      id: input.id,
      ...(input.period && { period: input.period }),
      ...(input.delivery_date && { delivery_date: new Date(input.delivery_date) }),
      ...(newNextBillingDate && { next_billing_date: newNextBillingDate }),
      provider_subscription_id: new_provider_subscription_id,
    });

    const subscription = await subscriptionService.retrieveSubscription(input.id);

    return new StepResponse({ subscription }, {
      id: input.id,
      providerId: existing.provider_id ?? SubscriptionProvider.STRIPE,
      new_provider_subscription_id,
      previous_next_billing_date: new Date(existing.next_billing_date!).toISOString(),
      previous_delivery_date: new Date(existing.delivery_date!).toISOString(),
      previous_period: existing.period!,
    } satisfies CompensationData);
  },
  async (data: CompensationData, { container }) => {
    if (!data?.new_provider_subscription_id) return;

    const subscriptionService: SubscriptionModuleService = container.resolve(SUBSCRIPTION_MODULE);

    try {
      const existing = await subscriptionService.retrieveSubscription(data.id);
      const adapter = getProviderAdapter(data.providerId);
      const { new_provider_subscription_id: restored_id } = await adapter.rollbackUpdateDeliveryDate(
        data.new_provider_subscription_id,
        existing.frequency,
        new Date(data.previous_next_billing_date),
      );

      await subscriptionService.updateSubscriptions({
        id: data.id,
        period: data.previous_period as 'morning' | 'afternoon' | 'evening',
        delivery_date: new Date(data.previous_delivery_date),
        next_billing_date: new Date(data.previous_next_billing_date),
        provider_subscription_id: restored_id,
      });
    } catch (error: any) {
      container.resolve('logger').error(`Failed to rollback delivery date update: ${error.message}`);
    }
  },
);
