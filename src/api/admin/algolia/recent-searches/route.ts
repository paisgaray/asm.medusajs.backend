import { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';

import { ALGOLIA_MODULE, AlgoliaRecentSearchesResponse } from '../../../../modules/algolia';
import AlgoliaModuleService from '../../../../modules/algolia/service';

export async function GET(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  try {
    const algoliaService: AlgoliaModuleService = req.scope.resolve(ALGOLIA_MODULE);
    const language = (req.query.language as string) || undefined;
    const limit = req.query.limit ? Number.parseInt(req.query.limit as string, 10) : 5;

    if (limit < 1 || limit > 50) {
      res.status(400).json({
        message: 'Limit must be between 1 and 50',
      });
      return;
    }

    const recentSearches: AlgoliaRecentSearchesResponse = await algoliaService.getRecentSearches(language, limit);

    res.json(recentSearches);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      message: 'Error fetching recent searches',
      error: errorMessage,
    });
  }
}
