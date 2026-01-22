/**
 * Subscriber: Order Confirmation
 * Escuta o evento order.placed (NATIVO) e dispara o workflow de envio de e-mail
 *
 * ✅ EVENTO NATIVO DO MEDUSAJS
 * 
 * Como funciona:
 * 1. Cliente completa checkout na loja
 * 2. MedusaJS cria o pedido e emite evento: order.placed ⚡
 * 3. Este subscriber escuta o evento e envia email AUTOMATICAMENTE
 *
 * Payload do evento:
 * {
 *   id: string  // ID do order
 * }
 *
 * Template SendGrid: d-51287e3277764d86aea821a1ea60c022
 * 
 * Evento 100% AUTOMÁTICO - Sem necessidade de ação manual!
 */

import type { SubscriberArgs, SubscriberConfig } from '@medusajs/framework';

import { sendOrderConfirmationEmailWorkflow } from '../workflows/email/send-order-confirmation-email';

export default async function handleOrderConfirmation({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const orderId = data.id;

  console.log('[Order Confirmation] ========================================');
  console.log(`[Order Confirmation] ✅ Evento NATIVO recebido: order.placed`);
  console.log(`[Order Confirmation] Order ID: ${orderId}`);
  console.log('[Order Confirmation] ========================================');

  try {
    console.log(`[Order Confirmation] Iniciando workflow de envio de e-mail...`);

    // Executar workflow de envio de e-mail
    await sendOrderConfirmationEmailWorkflow(container).run({
      input: {
        order_id: orderId,
      },
    });

    console.log('[Order Confirmation] ========================================');
    console.log(`[Order Confirmation] ✅ E-mail enviado com SUCESSO!`);
    console.log(`[Order Confirmation] Order ID: ${orderId}`);
    console.log('[Order Confirmation] ========================================');
  } catch (error) {
    // Log do erro mas não falha o subscriber
    // Isso evita que o evento seja reprocessado indefinidamente
    console.error('[Order Confirmation] ========================================');
    console.error(`[Order Confirmation] ❌ ERRO ao enviar e-mail`);
    console.error(`[Order Confirmation] Order ID: ${orderId}`);
    console.error(`[Order Confirmation] Erro:`, error);
    console.error('[Order Confirmation] ========================================');
  }
}

export const config: SubscriberConfig = {
  event: 'order.placed', // ✅ EVENTO NATIVO DO MEDUSAJS
};
