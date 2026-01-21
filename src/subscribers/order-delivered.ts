/**
 * Subscriber: Order Delivered
 * Escuta o evento delivery.created (NATIVO) e dispara o workflow de envio de e-mail
 *
 * ✅ EVENTO NATIVO DO MEDUSAJS v2.12.5
 * 
 * Referência Oficial: https://docs.medusajs.com/resources/references/events#fulfillment-events
 * 
 * Como funciona:
 * 1. Admin clica em "Mark as Delivered" no Medusa Admin
 * 2. Admin chama: POST /admin/orders/{id}/fulfillments/{fulfillment_id}/mark-as-delivered
 * 3. MedusaJS executa workflow: markOrderFulfillmentAsDeliveredWorkflow
 * 4. Workflow emite evento NATIVO: delivery.created ⚡
 * 5. Este subscriber escuta o evento e envia email AUTOMATICAMENTE
 *
 * Payload do evento:
 * {
 *   id: string  // ID do fulfillment
 * }
 *
 * Evento 100% AUTOMÁTICO - Sem necessidade de código customizado!
 */

import type { SubscriberArgs, SubscriberConfig } from '@medusajs/framework';

import { sendOrderDeliveredEmailWorkflow } from '../workflows/email/send-order-delivered-email';

export default async function handleOrderDelivered({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  // Evento nativo retorna { id: fulfillment_id }
  const fulfillmentId = data.id;

  console.log('[Order Delivered] ========================================');
  console.log(`[Order Delivered] ✅ Evento NATIVO recebido: delivery.created`);
  console.log(`[Order Delivered] Fulfillment ID: ${fulfillmentId}`);
  console.log('[Order Delivered] ========================================');

  try {
    console.log(`[Order Delivered] Iniciando workflow de envio de e-mail...`);

    // Executar workflow de envio de e-mail com fulfillment_id
    await sendOrderDeliveredEmailWorkflow(container).run({
      input: {
        fulfillment_id: fulfillmentId,
      },
    });

    console.log('[Order Delivered] ========================================');
    console.log(`[Order Delivered] ✅ E-mail enviado com SUCESSO!`);
    console.log(`[Order Delivered] Fulfillment ID: ${fulfillmentId}`);
    console.log('[Order Delivered] ========================================');
  } catch (error) {
    // Log do erro mas não falha o subscriber
    // Isso evita que o evento seja reprocessado indefinidamente
    console.error('[Order Delivered] ========================================');
    console.error(`[Order Delivered] ❌ ERRO ao enviar e-mail`);
    console.error(`[Order Delivered] Fulfillment ID: ${fulfillmentId}`);
    console.error(`[Order Delivered] Erro:`, error);
    console.error('[Order Delivered] ========================================');
  }
}

export const config: SubscriberConfig = {
  event: 'delivery.created', // ✅ EVENTO NATIVO DO MEDUSAJS
};
