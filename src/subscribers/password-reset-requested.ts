/**
 * Subscriber: Password Reset Requested
 * Escuta o evento user.password_reset_requested e dispara o workflow de envio de e-mail
 *
 * ✅ EVENTO CUSTOMIZADO (disparado por API route)
 * 
 * Como funciona:
 * 1. Cliente solicita reset de senha em /store/auth/reset-password
 * 2. API route valida email, gera token e emite evento
 * 3. Este subscriber escuta o evento e envia email AUTOMATICAMENTE
 *
 * Payload do evento:
 * {
 *   id: string         // ID do customer
 *   email: string      // Email do customer
 *   token: string      // Token de reset
 *   expires_at: string // Data de expiração
 * }
 *
 * Template SendGrid: d-97f70554211843c08e630e384ae6951f
 */

import type { SubscriberArgs, SubscriberConfig } from '@medusajs/framework';

import { sendPasswordResetEmailWorkflow } from '../workflows/email/send-password-reset-email';

export default async function handlePasswordResetRequested({
  event: { data },
  container,
}: SubscriberArgs<{ id: string; email: string; token: string; expires_at: string }>) {
  const customerId = data.id;
  const email = data.email;
  const token = data.token;

  console.log('[Password Reset] ========================================');
  console.log(`[Password Reset] Evento recebido: user.password_reset_requested`);
  console.log(`[Password Reset] Customer ID: ${customerId}`);
  console.log(`[Password Reset] Email: ${email}`);
  console.log(`[Password Reset] Token gerado: ${token.substring(0, 10)}...`);
  console.log('[Password Reset] ========================================');

  try {
    console.log(`[Password Reset] Iniciando workflow de envio de e-mail...`);

    // Executar workflow de envio de e-mail
    await sendPasswordResetEmailWorkflow(container).run({
      input: {
        customer_id: customerId,
        email,
        token,
      },
    });

    console.log('[Password Reset] ========================================');
    console.log(`[Password Reset] ✅ E-mail enviado com SUCESSO!`);
    console.log(`[Password Reset] Email: ${email}`);
    console.log('[Password Reset] ========================================');
  } catch (error) {
    console.error('[Password Reset] ========================================');
    console.error(`[Password Reset] ❌ ERRO ao enviar e-mail`);
    console.error(`[Password Reset] Email: ${email}`);
    console.error(`[Password Reset] Erro:`, error);
    console.error('[Password Reset] ========================================');
  }
}

export const config: SubscriberConfig = {
  event: 'user.password_reset_requested', // ✅ EVENTO CUSTOMIZADO
};
