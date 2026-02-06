import type { SubscriberArgs, SubscriberConfig } from '@medusajs/framework';

import { sendOrderShippedEmailWorkflow } from '../workflows/email/send-order-shipped-email';

export default async function handleOrderShipped({
  event: { data },
  container,
}: SubscriberArgs<{ id: string; order_id: string }>) {
  const fulfillment_id = data.id;

  try {
    await sendOrderShippedEmailWorkflow(container).run({ input: { fulfillment_id } });
  } catch (error) {
    console.error(`[Order Shipped] Erro ao enviar e-mail para order_id: ${fulfillment_id}`, error);
  }
}

export const config: SubscriberConfig = {
  event: 'shipment.created',
};
