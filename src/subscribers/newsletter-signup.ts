import type { SubscriberArgs, SubscriberConfig } from '@medusajs/framework';

import { SendGridMarketingService } from '../services/sendgrid-marketing.service';

type NewsletterSignupData = {
  email: string;
};

export default async function newsletterSignupHandler({
  event: { data },
}: SubscriberArgs<NewsletterSignupData>): Promise<void> {
  const { email } = data;

  // Verificar se a API key do SendGrid está configurada
  const sendGridApiKey = process.env.SENDGRID_API_KEY;
  if (!sendGridApiKey) {
    console.error('[Newsletter] SENDGRID_API_KEY não configurada. Contato não foi adicionado ao CRM.');
    return;
  }

  try {
    // Criar instância do serviço SendGrid Marketing
    const sendGridMarketingService = new SendGridMarketingService(sendGridApiKey);

    // Adicionar contato ao CRM do SendGrid (Marketing Contacts)
    // O contato será adicionado automaticamente ao "All Contacts"
    const result = await sendGridMarketingService.addContactToList({
      email,
    });

    if (result.success) {
      console.log(`[Newsletter] Contato ${email} adicionado com sucesso ao CRM do SendGrid`);
    } else {
      console.error(`[Newsletter] Erro ao adicionar contato ${email} ao CRM:`, result.message);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error(`[Newsletter] Erro ao processar inscrição de ${email}:`, errorMessage);
  }
}

export const config: SubscriberConfig = {
  event: 'newsletter.signup',
};
