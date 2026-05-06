import type { SubscriberArgs, SubscriberConfig } from '@medusajs/framework';

import { completeOrderWhenAllDeliveredWorkflow } from '../workflows/order/complete-order-when-all-delivered';

export default async function handleOrderAutoComplete({ event: { data }, container }: SubscriberArgs<{ id: string }>) {
  const fulfillment_id = data.id;

  try {
    const { result } = await completeOrderWhenAllDeliveredWorkflow(container).run({ input: { fulfillment_id } });

    if (result.completed) {
      console.log(
        `[AutoComplete] Order auto-completed after all fulfillments delivered (fulfillment: ${fulfillment_id})`,
      );
    }
  } catch (error) {
    console.error(`[AutoComplete] Error processing fulfillment ${fulfillment_id}:`, error);
  }
}

export const config: SubscriberConfig = {
  event: 'delivery.created',
};
