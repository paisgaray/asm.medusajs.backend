import { MedusaService } from '@medusajs/framework/utils';

import NewsletterSubscriber from './models/newsletter-subscriber';

class NewsletterService extends MedusaService({
  NewsletterSubscriber,
}) {}

export default NewsletterService;
