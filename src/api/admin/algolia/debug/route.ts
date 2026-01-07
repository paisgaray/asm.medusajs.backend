import { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';
import { SearchClient } from 'algoliasearch';

import { ALGOLIA_MODULE, AlgoliaSearchRequest, AlgoliaSearchResponse } from '../../../../modules/algolia';
import AlgoliaModuleService from '../../../../modules/algolia/service';

type DebugHit = {
  objectID: string;
  title: string;
  regional_tags?: string[];
  language?: string;
  tags?: string[];
};

type DebugResponse = {
  indexName: string;
  language: string;
  totalHits: number;
  products: DebugHit[];
};

export async function GET(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  try {
    const algoliaService: AlgoliaModuleService = req.scope.resolve(ALGOLIA_MODULE);
    const language = (req.query.language as string) || 'pt';
    const indexName = await algoliaService.getIndexName('product', language);

    const client = algoliaService['client'] as SearchClient;
    const searchRequest: AlgoliaSearchRequest = {
      requests: [
        {
          indexName,
          query: '',
          hitsPerPage: 100,
          attributesToRetrieve: ['objectID', 'title', 'regional_tags', 'language', 'tags'],
        },
      ],
    };

    const result = (await client.search(searchRequest)) as AlgoliaSearchResponse;
    const hits = result.results?.[0]?.hits || [];

    const response: DebugResponse = {
      indexName,
      language,
      totalHits: result.results?.[0]?.nbHits || 0,
      products: hits.map((hit) => ({
        objectID: hit.objectID,
        title: hit.title,
        regional_tags: hit.regional_tags || [],
        language: hit.language,
        tags: hit.tags || [],
      })),
    };

    res.json(response);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      message: 'Error fetching Algolia data',
      error: errorMessage,
    });
  }
}
