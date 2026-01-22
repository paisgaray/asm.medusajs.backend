/**
 * Subscriber: Order Invoiced
 * Escuta o evento payment.captured (NATIVO) e dispara o workflow de envio de e-mail
 *
 * ✅ EVENTO NATIVO DO MEDUSAJS
 * 
 * Como funciona:
 * 1. Pagamento é capturado/aprovado
 * 2. MedusaJS emite evento: payment.captured ⚡
 * 3. Este subscriber escuta o evento e envia email AUTOMATICAMENTE
 *
 * Payload do evento:
 * {
 *   id: string  // ID do payment
 * }
 *
 * Template SendGrid: d-c3c0dd4a6d0a46d6ab25da1ce99f6f89
 * 
 * ⚠️ NOTA: Este email é enviado junto com "Payment Approved" no mesmo evento
 * 
 * Evento 100% AUTOMÁTICO - Sem necessidade de ação manual!
 */

import type { SubscriberArgs, SubscriberConfig } from '@medusajs/framework';

import { sendOrderInvoicedEmailWorkflow } from '../workflows/email/send-order-invoiced-email';

export default async function handleOrderInvoiced({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const paymentId = data.id;

  console.log('[Order Invoiced] ========================================');
  console.log(`[Order Invoiced] ✅ Evento NATIVO recebido: payment.captured`);
  console.log(`[Order Invoiced] Payment ID: ${paymentId}`);
  console.log('[Order Invoiced] ========================================');

  try {
    console.log(`[Order Invoiced] Iniciando workflow de envio de e-mail...`);

    // Executar workflow de envio de e-mail
    await sendOrderInvoicedEmailWorkflow(container).run({
      input: {
        payment_id: paymentId,
      },
    });

    console.log('[Order Invoiced] ========================================');
    console.log(`[Order Invoiced] ✅ E-mail enviado com SUCESSO!`);
    console.log(`[Order Invoiced] Payment ID: ${paymentId}`);
    console.log('[Order Invoiced] ========================================');
  } catch (error) {
    // Log do erro mas não falha o subscriber
    // Isso evita que o evento seja reprocessado indefinidamente
    console.error('[Order Invoiced] ========================================');
    console.error(`[Order Invoiced] ❌ ERRO ao enviar e-mail`);
    console.error(`[Order Invoiced] Payment ID: ${paymentId}`);
    console.error(`[Order Invoiced] Erro:`, error);
    console.error('[Order Invoiced] ========================================');
  }
}

export const config: SubscriberConfig = {
  event: 'payment.captured', // ✅ ALTERADO: Agora escuta payment.captured
};
