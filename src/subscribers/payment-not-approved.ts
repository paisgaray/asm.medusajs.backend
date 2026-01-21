import type { SubscriberArgs, SubscriberConfig } from '@medusajs/framework';

import { sendPaymentNotApprovedEmailWorkflow } from '../workflows/email/send-payment-not-approved-email';

export default async function handlePaymentFailed({ event: { data }, container }: SubscriberArgs<{ id: string }>) {
  const paymentId = data.id;

  console.log(`[Payment Failed] Iniciando envio de e-mail para payment_id: ${paymentId}`);

  try {
    // Executar workflow de envio de e-mail
    await sendPaymentNotApprovedEmailWorkflow(container).run({
      input: {
        payment_id: paymentId,
      },
    });

    console.log(`[Payment Failed] E-mail enviado com sucesso para payment_id: ${paymentId}`);
  } catch (error) {
    // Log do erro mas não falha o subscriber
    // Isso evita que o evento seja reprocessado indefinidamente
    console.error(`[Payment Failed] Erro ao enviar e-mail para payment_id: ${paymentId}`, error);
  }
}

export const config: SubscriberConfig = {
  event: 'payment.failed',
};
