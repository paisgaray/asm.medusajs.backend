import { validateAndTransformQuery } from '@medusajs/framework';
import { MiddlewareRoute } from '@medusajs/medusa';
import { createFindParams } from '@medusajs/medusa/api/utils/validators';

export const findParams = createFindParams();

const bundledListQueryConfig = {
  defaults: ['id', 'first_name', 'last_name', 'email', 'phone', 'subject', 'message'],
  isList: true,
  defaultLimit: 15,
};

export const contactAdminMiddlewares: MiddlewareRoute[] = [
  {
    matcher: '/admin/contact',
    methods: ['GET'],
    middlewares: [validateAndTransformQuery(findParams, bundledListQueryConfig)],
  },
];
