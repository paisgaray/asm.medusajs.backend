import type { SubscriberArgs, SubscriberConfig } from '@medusajs/framework';

import { sendOrderPreparingEmailWorkflow } from '../workflows/email/send-order-preparing-email';

export default async function handleOrderPreparing({
  event: { data },
  container,
}: SubscriberArgs<{ id: string; order_id: string }>) {
  const orderId = data.order_id || data.id;

  try {
    await sendOrderPreparingEmailWorkflow(container).run({
      input: {
        order_id: orderId,
      },
    });
  } catch (error) {
    console.error(`[Order Preparing] Erro ao enviar e-mail para order_id: ${orderId}`, error);
  }
}

export const config: SubscriberConfig = {
  event: 'order.fulfillment_created', // ✅ EVENTO NATIVO DO MEDUSAJS
};
