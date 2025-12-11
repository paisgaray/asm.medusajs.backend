import { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';
import { SearchClient } from 'algoliasearch';

import { ALGOLIA_MODULE, AlgoliaSearchRequest, AlgoliaSearchResponse } from '../../../../modules/algolia';
import AlgoliaModuleService from '../../../../modules/algolia/service';

type TestHit = {
  objectID: string;
  title: string;
  regional_tags: string[];
};

type TestResult = {
  nbHits: number;
  hits: TestHit[];
};

type TestSearchResponse = {
  indexName: string;
  query: string;
  language: string;
  tests: {
    withoutFilters: TestResult;
    withFilters: TestResult & { filterString: string };
    emptyQuery: TestResult;
  };
};

export async function GET(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  try {
    const algoliaService: AlgoliaModuleService = req.scope.resolve(ALGOLIA_MODULE);
    const query = (req.query.q as string) || 'med';
    const language = (req.query.language as string) || 'pt';
    const indexName = await algoliaService.getIndexName('product', language);

    const client = algoliaService['client'] as SearchClient;
    const lang = language.toLowerCase();

    const searchRequestWithoutFilters: AlgoliaSearchRequest = {
      requests: [
        {
          indexName,
          query,
          hitsPerPage: 10,
          attributesToRetrieve: ['objectID', 'title', 'regional_tags', 'language'],
        },
      ],
    };

    const searchWithoutFilters = (await client.search(searchRequestWithoutFilters)) as AlgoliaSearchResponse;

    const filterString = `(regional_tags:${lang} OR regional_tags:${lang}-BR OR regional_tags:${lang}-001)`;

    const searchRequestWithFilters: AlgoliaSearchRequest = {
      requests: [
        {
          indexName,
          query,
          hitsPerPage: 10,
          filters: filterString,
          attributesToRetrieve: ['objectID', 'title', 'regional_tags', 'language'],
        },
      ],
    };

    const searchWithFilters = (await client.search(searchRequestWithFilters)) as AlgoliaSearchResponse;

    const searchRequestEmpty: AlgoliaSearchRequest = {
      requests: [
        {
          indexName,
          query: '',
          hitsPerPage: 10,
          attributesToRetrieve: ['objectID', 'title', 'regional_tags', 'language'],
        },
      ],
    };

    const searchEmpty = (await client.search(searchRequestEmpty)) as AlgoliaSearchResponse;

    const mapHit = (h: { objectID: string; title: string; regional_tags?: string[] }): TestHit => ({
      objectID: h.objectID,
      title: h.title,
      regional_tags: h.regional_tags || [],
    });

    const response: TestSearchResponse = {
      indexName,
      query,
      language,
      tests: {
        withoutFilters: {
          nbHits: searchWithoutFilters.results?.[0]?.nbHits || 0,
          hits: searchWithoutFilters.results?.[0]?.hits?.map(mapHit) || [],
        },
        withFilters: {
          filterString,
          nbHits: searchWithFilters.results?.[0]?.nbHits || 0,
          hits: searchWithFilters.results?.[0]?.hits?.map(mapHit) || [],
        },
        emptyQuery: {
          nbHits: searchEmpty.results?.[0]?.nbHits || 0,
          hits: searchEmpty.results?.[0]?.hits?.map(mapHit) || [],
        },
      },
    };

    res.json(response);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    res.status(500).json({
      message: 'Error testing Algolia search',
      error: errorMessage,
      stack: errorStack,
    });
  }
}
