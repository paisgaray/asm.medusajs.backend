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

import { ContainerRegistrationKeys, Modules } from '@medusajs/framework/utils';
import type { SubscriberArgs, SubscriberConfig } from '@medusajs/framework';

import { SENDGRID_TEMPLATES } from '../utils/sendgrid-templates';

// Log para verificar se o arquivo está sendo carregado
console.log('[Password Reset Subscriber] Arquivo carregado - Subscriber registrado para evento: auth.password_reset');

export default async function resetPasswordTokenHandler({
  event: { data },
  container,
}: SubscriberArgs<{ entity_id: string; token: string; actor_type: string }>) {
  console.log('[Password Reset Subscriber] Evento recebido:', JSON.stringify(data, null, 2));
  
  const email = data.entity_id; // email do usuário
  const token = data.token; // JWT token gerado pelo Medusa (não hexadecimal!)
  const actorType = data.actor_type; // 'customer' ou 'user'

  console.log('[Password Reset Subscriber] Email:', email);
  console.log('[Password Reset Subscriber] Token (primeiros 20 chars):', token?.substring(0, 20));
  console.log('[Password Reset Subscriber] Actor Type:', actorType);

  // Só processa se for para customer (não admin)
  if (actorType !== 'customer') {
    console.log('[Password Reset Subscriber] Ignorando evento - não é customer, é:', actorType);
    return;
  }

  try {
    console.log('[Password Reset Subscriber] Iniciando processamento do email...');
    
    const notificationModuleService = container.resolve(Modules.NOTIFICATION);
    console.log('[Password Reset Subscriber] Módulo de Notificação resolvido');

    // Define o prefixo da URL baseado no tipo de usuário (customer)
    // Usa STORE_URL do env ou fallback para localhost
    const storeUrl = process.env.STORE_URL || 'http://localhost:8000';
    console.log('[Password Reset Subscriber] STORE_URL:', storeUrl);
    
    // URL formatada conforme pedido do front-end: /account?token=...&email=...
    // IMPORTANTE: O token JWT é passado diretamente na URL. Para evitar corrupção do token
    // pelo SendGrid Click Tracking:
    // 1. Desabilitar Click Tracking nas configurações do template no painel do SendGrid
    // 2. Ou adicionar atributo clicktracking=off na tag <a> do template HTML
    // Template ID: d-97f70554211843c08e630e384ae6951f
    const resetUrl = `${storeUrl}/account?token=${token}&email=${encodeURIComponent(email)}`;
    console.log('[Password Reset Subscriber] URL de reset gerada:', resetUrl.substring(0, 100) + '...');

    // Buscar customer para obter o primeiro nome (opcional, para personalização)
    // Usando Remote Query (padrão Medusa v2) para melhor performance
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
    } catch (customerError) {
      // Se não conseguir buscar o customer, usa o email como fallback
      firstName = email.split('@')[0] || 'Cliente';
    }

    // Envia a notificação usando o módulo de Notificação do Medusa (SendGrid)
    console.log('[Password Reset Subscriber] Enviando notificação...');
    console.log('[Password Reset Subscriber] Template ID:', SENDGRID_TEMPLATES.RESET_PASSWORD);
    console.log('[Password Reset Subscriber] Dados do template:', {
      firstName,
      actionUrl: resetUrl.substring(0, 100) + '...',
    });

    const notificationResult = await notificationModuleService.createNotifications({
      to: email,
      channel: 'email',
      template: SENDGRID_TEMPLATES.RESET_PASSWORD, // ID do template dinâmico no SendGrid
      data: {
        firstName,
        // IMPORTANTE: No template SendGrid, use {{{actionUrl}}} ao invés de {{actionUrl}}
        // Isso escapa automaticamente caracteres especiais (', ", &) na URL e resolve o aviso
        // Exemplo no template: <a href="{{{actionUrl}}}">Restablecer contraseña</a>
        actionUrl: resetUrl,
        reset_url: resetUrl, // Também disponível como reset_url para compatibilidade
      },
    });

    console.log(`[Password Reset Subscriber] ✅ Email enviado com sucesso para: ${email}`);
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
