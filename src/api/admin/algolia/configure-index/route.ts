import { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';
import { SearchClient } from 'algoliasearch';

import { ALGOLIA_MODULE } from '../../../../modules/algolia';
import AlgoliaModuleService from '../../../../modules/algolia/service';

type ConfigureIndexBody = {
  language?: string;
};

type ConfigureIndexResponse = {
  message: string;
  indexName: string;
  language: string;
  settings: {
    attributesForFaceting: string[];
    searchableAttributes: string[];
  };
};

export async function POST(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  try {
    const algoliaService: AlgoliaModuleService = req.scope.resolve(ALGOLIA_MODULE);
    const body = (req.body as ConfigureIndexBody) || {};
    const language = body.language ?? 'pt';
    const indexName = await algoliaService.getIndexName('product', language);

    const client = algoliaService['client'] as SearchClient;
    await client.setSettings({
      indexName,
      indexSettings: {
        attributesForFaceting: ['filterOnly(regional_tags)', 'searchable(regional_tags)'],
        searchableAttributes: ['title', 'description', 'handle', 'tags'],
        attributesToRetrieve: [
          'objectID',
          'title',
          'description',
          'handle',
          'images',
          'price',
          'regional_tags',
          'language',
          'tags',
        ],
      },
    });

    const response: ConfigureIndexResponse = {
      message: 'Index configured successfully',
      indexName,
      language,
      settings: {
        attributesForFaceting: ['filterOnly(regional_tags)', 'searchable(regional_tags)'],
        searchableAttributes: ['title', 'description', 'handle', 'tags'],
      },
    };

    res.json(response);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    res.status(500).json({
      message: 'Error configuring Algolia index',
      error: errorMessage,
      stack: errorStack,
    });
  }
}
