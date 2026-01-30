import type { SubscriberArgs, SubscriberConfig } from '@medusajs/framework';

import { sendOrderInvoicedEmailWorkflow } from '../workflows/email/send-order-invoiced-email';
import { sendPaymentApprovedEmailWorkflow } from '../workflows/email/send-payment-approved-email';

console.log('[Payment Captured Subscriber] Subscriber carregado e registrado para evento: payment.captured');

export default async function handlePaymentCaptured({ event: { data }, container }: SubscriberArgs<{ id: string }>) {
  const paymentId = data.id;
  const timestamp = new Date().toISOString();

  console.log(`[Payment Captured Subscriber] ✅ Evento payment.captured capturado!`);
  console.log(`[Payment Captured Subscriber] Payment ID: ${paymentId}`);
  console.log(`[Payment Captured Subscriber] Timestamp: ${timestamp}`);
  console.log(`[Payment Captured Subscriber] Event data:`, JSON.stringify(data, null, 2));

  // Email de Pagamento Aprovado
  try {
    console.log(`[Payment Captured Subscriber] Enviando email de Pagamento Aprovado...`);
    const result1 = await sendPaymentApprovedEmailWorkflow(container).run({
      input: {
        payment_id: paymentId,
      },
    });
    console.log(`[Payment Captured Subscriber] ✅ Email de Pagamento Aprovado enviado!`);
    console.log(`[Payment Captured Subscriber] Result:`, JSON.stringify(result1, null, 2));
  } catch (error) {
    console.error(
      `[Payment Captured Subscriber] ❌ ERRO ao enviar email de Pagamento Aprovado para payment_id: ${paymentId}`,
      error,
    );
    if (error instanceof Error) {
      console.error(`[Payment Captured Subscriber] Mensagem:`, error.message);
      console.error(`[Payment Captured Subscriber] Stack:`, error.stack);
    }
  }

  // Email de Order Invoiced
  try {
    console.log(`[Payment Captured Subscriber] Enviando email de Order Invoiced...`);
    const result2 = await sendOrderInvoicedEmailWorkflow(container).run({
      input: {
        payment_id: paymentId,
      },
    });
    console.log(`[Payment Captured Subscriber] ✅ Email de Order Invoiced enviado!`);
    console.log(`[Payment Captured Subscriber] Result:`, JSON.stringify(result2, null, 2));
  } catch (error) {
    console.error(
      `[Payment Captured Subscriber] ❌ ERRO ao enviar email de Order Invoiced para payment_id: ${paymentId}`,
      error,
    );
    if (error instanceof Error) {
      console.error(`[Payment Captured Subscriber] Mensagem:`, error.message);
      console.error(`[Payment Captured Subscriber] Stack:`, error.stack);
    }
  }
}

export const config: SubscriberConfig = {
  event: 'payment.captured',
};
