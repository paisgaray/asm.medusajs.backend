import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';

import { NEWSLETTER_MODULE } from '../../../../../modules/newsletter';
import NewsletterModuleService from '../../../../../modules/newsletter/service';

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    const newsletterService: NewsletterModuleService = req.scope.resolve(NEWSLETTER_MODULE);

    const { status } = req.query as { status?: string };

    const filters: Record<string, unknown> = {};
    if (status) {
      filters.status = status;
    }

    const subscribers = await newsletterService.listNewsletterSubscribers(filters);

    // Gerar CSV
    const csvHeaders = 'ID,Email,First Name,Last Name,Status,Subscribed At,Unsubscribed At\n';
    const csvRows = subscribers
      .map((sub) => {
        return [
          sub.id,
          sub.email,
          sub.first_name || '',
          sub.last_name || '',
          sub.status,
          sub.subscribed_at ? new Date(sub.subscribed_at).toISOString() : '',
          sub.unsubscribed_at ? new Date(sub.unsubscribed_at).toISOString() : '',
        ]
          .map((field) => `"${String(field).replace(/"/g, '""')}"`)
          .join(',');
      })
      .join('\n');

    const csv = csvHeaders + csvRows;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=newsletter-subscribers-${Date.now()}.csv`);

    return res.send(csv);
  } catch {
    return res.status(500).json({
      success: false,
      message: 'Erro ao exportar subscribers',
    });
  }
}
