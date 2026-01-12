import { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';

export async function GET(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  const newsletterService: any = req.scope.resolve('newsletter');

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
