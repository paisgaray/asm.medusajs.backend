import type { SubscriberArgs, SubscriberConfig } from '@medusajs/framework';

import { sendOrderInvoicedEmailWorkflow } from '../workflows/email/send-order-invoiced-email';
import { sendPaymentApprovedEmailWorkflow } from '../workflows/email/send-payment-approved-email';

export default async function handlePaymentCaptured({ event: { data }, container }: SubscriberArgs<{ id: string }>) {
  const payment_id = data.id;

  try {
    await sendPaymentApprovedEmailWorkflow(container).run({ input: { payment_id } });
  } catch {
    console.error(`[Payment Approved] Erro ao enviar e-mail para payment_id: ${payment_id}`);
  }

  try {
    await sendOrderInvoicedEmailWorkflow(container).run({ input: { payment_id } });
  } catch {
    console.error(`[Order Invoiced] Erro ao enviar e-mail para payment_id: ${payment_id}`);
  }
}

export const config: SubscriberConfig = {
  event: 'payment.captured',
};
