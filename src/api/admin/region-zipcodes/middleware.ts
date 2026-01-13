import { validateAndTransformBody, validateAndTransformQuery } from '@medusajs/framework';
import { MiddlewareRoute } from '@medusajs/medusa';
import { createFindParams } from '@medusajs/medusa/api/utils/validators';

import { regionZipcodeItemMiddlewares } from './[id]/middleware';
import { CreateZipCodeSchema } from './validators';

export const findParams = createFindParams();

const bundledListQueryConfig = {
  defaults: ['id', 'region_id', 'zipcode', 'created_at'],
  isList: true,
  defaultLimit: 15,
};

export const regionZipcodeMiddlewares: MiddlewareRoute[] = [
  ...regionZipcodeItemMiddlewares,
  {
    matcher: '/admin/region-zipcodes',
    methods: ['GET'],
    middlewares: [validateAndTransformQuery(findParams, bundledListQueryConfig)],
  },
  {
    matcher: '/admin/region-zipcodes',
    methods: ['POST'],
    middlewares: [validateAndTransformBody(CreateZipCodeSchema)],
  },
];
