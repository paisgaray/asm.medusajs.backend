import { validateAndTransformBody } from '@medusajs/framework';
import { MiddlewareRoute } from '@medusajs/medusa';

import { RecommenderSchema } from './validators';

export const recommenderMiddlewares: MiddlewareRoute[] = [
  {
    matcher: '/admin/recommender',
    methods: ['POST'],
    middlewares: [validateAndTransformBody(RecommenderSchema)],
  },
];
