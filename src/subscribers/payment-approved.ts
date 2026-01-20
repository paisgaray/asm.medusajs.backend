/**
 * Subscriber: Payment Approved
 * Escuta o evento payment.captured e dispara o workflow de envio de e-mail
 */

import type { SubscriberArgs, SubscriberConfig } from '@medusajs/framework';
import { sendPaymentApprovedEmailWorkflow } from '../workflows/email/send-payment-approved-email';

export default async function handlePaymentCaptured({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const paymentId = data.id;

  console.log(`[Payment Captured] Iniciando envio de e-mail para payment_id: ${paymentId}`);

  try {
    // Executar workflow de envio de e-mail
    await sendPaymentApprovedEmailWorkflow(container).run({
      input: {
        payment_id: paymentId,
      },
    });

    console.log(`[Payment Captured] E-mail enviado com sucesso para payment_id: ${paymentId}`);
  } catch (error) {
    // Log do erro mas não falha o subscriber
    // Isso evita que o evento seja reprocessado indefinidamente
    console.error(`[Payment Captured] Erro ao enviar e-mail para payment_id: ${paymentId}`, error);
  }
}

export const config: SubscriberConfig = {
  event: 'payment.captured',
};
