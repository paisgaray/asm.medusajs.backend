import type { SubscriberArgs, SubscriberConfig } from '@medusajs/framework';

import { sendPaymentNotApprovedEmailWorkflow } from '../workflows/email/send-payment-not-approved-email';

export default async function handlePaymentFailed({ event: { data }, container }: SubscriberArgs<{ id: string }>) {
  const paymentId = data.id;

  try {
    await sendPaymentNotApprovedEmailWorkflow(container).run({
      input: {
        payment_id: paymentId,
      },
    });
  } catch (error) {
    console.error(`[Payment Failed] Erro ao enviar e-mail para payment_id: ${paymentId}`, error);
  }
}

export const config: SubscriberConfig = {
  event: 'payment.failed',
};
