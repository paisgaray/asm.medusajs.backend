import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk';

import { NEWSLETTER_MODULE } from '../../../modules/newsletter';
import NewsletterModuleService from '../../../modules/newsletter/service';

export interface SaveSubscriberInput {
  email: string;
  first_name?: string;
  last_name?: string;
}

export interface SaveSubscriberOutput {
  success: boolean;
  message: string;
  subscriber_id?: string;
}

export const saveSubscriberStep = createStep(
  'save-subscriber-step',
  async (input: SaveSubscriberInput, { container }) => {
    const { email, first_name, last_name } = input;

    const newsletterService: NewsletterModuleService = container.resolve(NEWSLETTER_MODULE);

    try {
      // Verificar se já existe
      const existing = await newsletterService.listNewsletterSubscribers({
        email,
      });

      let subscriber;

      if (existing && existing.length > 0) {
        // Atualizar existente para status subscribed
        subscriber = await newsletterService.updateNewsletterSubscribers({
          id: existing[0].id,
          status: 'subscribed',
          first_name: first_name || existing[0].first_name,
          last_name: last_name || existing[0].last_name,
          subscribed_at: new Date(),
          unsubscribed_at: null,
        });
      } else {
        // Criar novo
        subscriber = await newsletterService.createNewsletterSubscribers({
          email,
          first_name,
          last_name,
          status: 'subscribed',
          subscribed_at: new Date(),
        });
      }

      return new StepResponse({
        success: true,
        message: 'Email adicionado à newsletter com sucesso',
        subscriber_id: subscriber.id,
      });
    } catch {
      throw new Error('Falha ao adicionar email à newsletter');
    }
  },
);
