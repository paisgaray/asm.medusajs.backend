import type { SubscriberArgs, SubscriberConfig } from '@medusajs/framework';

import { sendPasswordResetEmailWorkflow } from '../workflows/email/send-password-reset-email';

export default async function handlePasswordResetRequested({
  event: { data },
  container,
}: SubscriberArgs<{ id: string; email: string; token: string; expires_at: string }>) {
  const customerId = data.id;
  const email = data.email;
  const token = data.token;

  try {
    await sendPasswordResetEmailWorkflow(container).run({
      input: {
        customer_id: customerId,
        email,
        token,
      },
    });
  } catch (error) {
    console.error(`[Password Reset] Erro ao enviar e-mail para: ${email}`, error);
  }
}

export const config: SubscriberConfig = {
  event: 'user.password_reset_requested', // ✅ EVENTO CUSTOMIZADO
};
