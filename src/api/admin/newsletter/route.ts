import { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';

import NewsletterModuleService from '../../../modules/newsletter/service';

export async function GET(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  const newsletterService = req.scope.resolve('newsletter') as NewsletterModuleService;

  const [subscribers, count] = await newsletterService.listAndCountNewsletterSubscribers(
    {},
    {
      order: { subscribed_at: 'DESC' },
    },
  );

  res.status(200).json({
    subscribers,
    count,
  });
}
