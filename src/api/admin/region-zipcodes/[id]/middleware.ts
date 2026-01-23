import { validateAndTransformBody } from '@medusajs/framework';
import { MiddlewareRoute } from '@medusajs/medusa';

import { validatePathParams } from '../../../../utils/validate-path-params';
import {
  GetRegionZipcodeItemQuerySchema,
  UpdateRegionZipcodeItemQuerySchema,
  UpdateRegionZipcodeItemSchema,
  DeleteRegionZipcodeItemQuerySchema,
} from '../validators';

export const regionZipcodeItemMiddlewares: MiddlewareRoute[] = [
  {
    matcher: '/admin/region-zipcodes/:id',
    methods: ['GET'],
    middlewares: [validatePathParams(GetRegionZipcodeItemQuerySchema)],
  },
  {
    matcher: '/admin/region-zipcodes/:id',
    methods: ['PUT'],
    middlewares: [
      validatePathParams(UpdateRegionZipcodeItemQuerySchema),
      validateAndTransformBody(UpdateRegionZipcodeItemSchema),
    ],
  },
  {
    matcher: '/admin/region-zipcodes/:id',
    methods: ['DELETE'],
    middlewares: [validatePathParams(DeleteRegionZipcodeItemQuerySchema)],
  },
];
