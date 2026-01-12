import { defineMiddlewares } from '@medusajs/framework/http';
import { z } from 'zod';
import { StoreProductSearchBodySchema } from './validators';

export default defineMiddlewares({
  routes: [
    {
      matcher: '/store/products/search',
      method: 'POST',
      middlewares: [
        {
          method: 'POST',
          bodyParser: { sizeLimit: '1mb' },
        },
      ],
    },
  ],
  bodyParser: {
    preserveRawBody: false,
  },
  validate: {
    body: StoreProductSearchBodySchema,
  },
});
