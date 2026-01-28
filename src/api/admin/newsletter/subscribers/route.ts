import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';

import { NEWSLETTER_MODULE } from '../../../../modules/newsletter';
import NewsletterModuleService from '../../../../modules/newsletter/service';

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    const newsletterService: NewsletterModuleService = req.scope.resolve(NEWSLETTER_MODULE);

    const { status } = req.query as { status?: string };

    const filters: Record<string, unknown> = {};
    if (status) {
      filters.status = status;
    }

    const subscribers = await newsletterService.listNewsletterSubscribers(filters);

    const count = subscribers.length;

    return res.status(200).json({
      subscribers,
      count,
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: 'Erro ao listar subscribers',
    });
  }
}
