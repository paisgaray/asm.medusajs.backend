import { validateAndTransformBody } from '@medusajs/framework';
import { MiddlewareRoute } from '@medusajs/medusa';

import { CreateContactSchema } from './validators';

export const contactStoreMiddlewares: MiddlewareRoute[] = [
  {
    matcher: '/store/contact',
    methods: ['POST'],
    middlewares: [validateAndTransformBody(CreateContactSchema)],
  },
];
