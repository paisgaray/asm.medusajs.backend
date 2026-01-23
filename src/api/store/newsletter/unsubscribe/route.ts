import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';

import { NEWSLETTER_MODULE } from '../../../../modules/newsletter';
import NewsletterModuleService from '../../../../modules/newsletter/service';

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  try {
    const { email } = req.body as { email: string };

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email é obrigatório',
      });
    }

    const newsletterService: NewsletterModuleService = req.scope.resolve(NEWSLETTER_MODULE);

    const normalizedEmail = email.toLowerCase().trim();

    // Buscar subscriber
    const subscribers = await newsletterService.listNewsletterSubscribers({
      email: normalizedEmail,
    });

    if (!subscribers || subscribers.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Email não encontrado na newsletter',
      });
    }

    const subscriber = subscribers[0];

    // Atualizar status para unsubscribed
    await newsletterService.updateNewsletterSubscribers({
      id: subscriber.id,
      status: 'unsubscribed',
      unsubscribed_at: new Date(),
    });

    return res.status(200).json({
      success: true,
      message: 'Email removido da newsletter com sucesso',
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: 'Erro ao remover email da newsletter',
    });
  }
}
