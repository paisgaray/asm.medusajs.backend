import { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';

import { ALGOLIA_MODULE } from '../../../../modules/algolia';
import AlgoliaModuleService from '../../../../modules/algolia/service';
import type { StoreProductSearchBody } from './validators';

export async function POST(req: MedusaRequest<StoreProductSearchBody>, res: MedusaResponse): Promise<void> {
  const algoliaModuleService: AlgoliaModuleService = req.scope.resolve(ALGOLIA_MODULE);
  const { query } = req.validatedBody;

  const results = await algoliaModuleService.search(query as string);

  res.json(results);
}
