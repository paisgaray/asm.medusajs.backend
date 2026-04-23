/**
 * Subscriber para evento auth.password_reset do Medusa v2
 *
 * Este subscriber escuta o evento nativo do módulo de Auth do Medusa
 * e envia o email de reset de senha usando o módulo de Notificação.
 *
 * Estrutura do evento:
 * - entity_id: email do usuário
 * - token: JWT token gerado pelo Medusa
 * - actor_type: 'customer' ou 'user'
 *
 * Referência: https://docs.medusajs.com/resources/commerce-modules/auth/reset-password
 */

import type { SubscriberArgs, SubscriberConfig } from '@medusajs/framework';
import { ContainerRegistrationKeys, Modules } from '@medusajs/framework/utils';

import { SENDGRID_TEMPLATES, TamplateLang } from '../constants/sendgrid-templates';

type Input = {
  entity_id: string;
  token: string;
  actor_type: string;
  metadata: Record<string, unknown>;
};

export default async function resetPasswordTokenHandler({ event: { data }, container }: SubscriberArgs<Input>) {
  console.log('[Password Reset Subscriber] Evento recebido:', JSON.stringify(data, null, 2));

  const email = data.entity_id; // email do usuário
  const token = data.token; // JWT token gerado pelo Medusa (não hexadecimal!)
  const actorType = data.actor_type; // 'customer' ou 'user'

  console.log('[Password Reset Subscriber] Email:', email);
  console.log('[Password Reset Subscriber] Token (primeiros 20 chars):', token?.substring(0, 20));
  console.log('[Password Reset Subscriber] Actor Type:', actorType);

  if (actorType !== 'customer') {
    console.log('[Password Reset Subscriber] Ignorando evento - não é customer, é:', actorType);
    return;
  }

  try {
    console.log('[Password Reset Subscriber] Iniciando processamento do email...');

    const notificationModuleService = container.resolve(Modules.NOTIFICATION);
    console.log('[Password Reset Subscriber] Módulo de Notificação resolvido');

    const storeUrl = process.env.STORE_URL || 'http://localhost:8000';
    console.log('[Password Reset Subscriber] STORE_URL:', storeUrl);

    const resetUrl = `${storeUrl}/account?token=${token}&email=${encodeURIComponent(email)}`;
    console.log('[Password Reset Subscriber] URL de reset gerada:', resetUrl.substring(0, 100) + '...');

    let firstName = 'Cliente';
    try {
      const query = container.resolve(ContainerRegistrationKeys.QUERY);
      const { data: customers } = await query.graph({
        entity: 'customer',
        fields: ['first_name'],
        filters: { email },
      });

      if (customers && customers.length > 0) {
        firstName = customers[0]?.first_name || email.split('@')[0] || 'Cliente';
      }
    } catch {
      firstName = email.split('@')[0] || 'Cliente';
    }

    const language = data.metadata.language as TamplateLang;

    const notificationResult = await notificationModuleService.createNotifications({
      to: email,
      channel: 'email',
      template: SENDGRID_TEMPLATES[language].RESET_PASSWORD, // ID do template dinâmico no SendGrid
      data: {
        firstName,
        actionUrl: resetUrl,
        reset_url: resetUrl,
      },
    });

    console.log('[Password Reset Subscriber] Resultado da notificação:', JSON.stringify(notificationResult, null, 2));
  } catch (error) {
    console.error(`[Password Reset Subscriber] ❌ Erro ao enviar e-mail para: ${email}`, error);
    if (error instanceof Error) {
      console.error('[Password Reset Subscriber] Stack trace:', error.stack);
      console.error('[Password Reset Subscriber] Mensagem de erro:', error.message);
    }
    // Não relança o erro para não quebrar o fluxo do Medusa
  }
}

export const config: SubscriberConfig = {
  event: 'auth.password_reset', // ✅ EVENTO NATIVO DO MEDUSA v2
};
