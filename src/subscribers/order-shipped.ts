/**
 * Subscriber: Order Shipped
 * Escuta o evento order.shipment_created (NATIVO) e dispara o workflow de envio de e-mail
 *
 * NOTA: Usa evento NATIVO do MedusaJS:
 * - order.shipment_created: Disparado automaticamente quando shipment/remessa é criado
 * - Isso representa o pedido sendo enviado para entrega
 *
 * Evento 100% AUTOMÁTICO - não precisa disparo manual!
 */

import type { SubscriberArgs, SubscriberConfig } from '@medusajs/framework';

import { sendOrderShippedEmailWorkflow } from '../workflows/email/send-order-shipped-email';

export default async function handleOrderShipped({
  event: { data },
  container,
}: SubscriberArgs<{ id: string; order_id: string }>) {
  // order.shipment_created retorna { id: shipment_id, order_id: order_id }
  const orderId = data.order_id || data.id;

  console.log(`[Order Shipped] Iniciando envio de e-mail para order_id: ${orderId}`);

  try {
    // Executar workflow de envio de e-mail
    await sendOrderShippedEmailWorkflow(container).run({
      input: {
        order_id: orderId,
      },
    });

    console.log(`[Order Shipped] E-mail enviado com sucesso para order_id: ${orderId}`);
  } catch (error) {
    // Log do erro mas não falha o subscriber
    // Isso evita que o evento seja reprocessado indefinidamente
    console.error(`[Order Shipped] Erro ao enviar e-mail para order_id: ${orderId}`, error);
  }
}

export const config: SubscriberConfig = {
  event: 'order.shipment_created', // ✅ EVENTO NATIVO DO MEDUSAJS
};
