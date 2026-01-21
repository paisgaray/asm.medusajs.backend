import type { SubscriberArgs, SubscriberConfig } from '@medusajs/framework';

import { sendOrderInvoicedEmailWorkflow } from '../workflows/email/send-order-invoiced-email';

export default async function handleOrderInvoiced({ event: { data }, container }: SubscriberArgs<{ id: string }>) {
  const orderId = data.id;

  console.log(`[Order Invoiced] Iniciando envio de e-mail para order_id: ${orderId}`);

  try {
    // Executar workflow de envio de e-mail
    await sendOrderInvoicedEmailWorkflow(container).run({
      input: {
        order_id: orderId,
      },
    });

    console.log(`[Order Invoiced] E-mail enviado com sucesso para order_id: ${orderId}`);
  } catch (error) {
    // Log do erro mas não falha o subscriber
    // Isso evita que o evento seja reprocessado indefinidamente
    console.error(`[Order Invoiced] Erro ao enviar e-mail para order_id: ${orderId}`, error);
  }
}

export const config: SubscriberConfig = {
  event: 'order.placed', // ✅ EVENTO NATIVO DO MEDUSAJS
};
