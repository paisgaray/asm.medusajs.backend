import { validateAndTransformBody } from '@medusajs/framework';
import { MiddlewareRoute } from '@medusajs/medusa';

import { NewsletterSubscribeSchema } from './validators';

export const newsletterMiddlewares: MiddlewareRoute[] = [
  {
    matcher: '/store/newsletter',
    methods: ['POST'],
    middlewares: [validateAndTransformBody(NewsletterSubscribeSchema)],
  },
];
