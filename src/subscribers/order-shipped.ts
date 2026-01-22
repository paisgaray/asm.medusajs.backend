import type { SubscriberArgs, SubscriberConfig } from '@medusajs/framework';

import { sendOrderShippedEmailWorkflow } from '../workflows/email/send-order-shipped-email';

export default async function handleOrderShipped({
  event: { data },
  container,
}: SubscriberArgs<{ id: string; order_id: string }>) {
  const orderId = data.order_id || data.id;

  try {
    await sendOrderShippedEmailWorkflow(container).run({
      input: {
        order_id: orderId,
      },
    });
  } catch (error) {
    console.error(`[Order Shipped] Erro ao enviar e-mail para order_id: ${orderId}`, error);
  }
}

export const config: SubscriberConfig = {
  event: 'order.shipment_created', // ✅ EVENTO NATIVO DO MEDUSAJS
};
