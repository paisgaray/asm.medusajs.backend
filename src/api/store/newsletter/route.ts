import { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';

import NewsletterModuleService from '../../../modules/newsletter/service';
import type { NewsletterSubscribeBody } from './validators';

export async function POST(req: MedusaRequest<NewsletterSubscribeBody>, res: MedusaResponse): Promise<void> {
  const { email } = req.validatedBody;

  const newsletterService: NewsletterModuleService = req.scope.resolve('newsletter');

  const [existingSubscriber] = await newsletterService.listNewsletterSubscribers({ email });

  if (existingSubscriber) return;

  await newsletterService.createNewsletterSubscribers({ email, subscribed_at: new Date() });

  res.status(200).json({
    success: true,
    message: 'Inscrição realizada com sucesso',
  });
}
