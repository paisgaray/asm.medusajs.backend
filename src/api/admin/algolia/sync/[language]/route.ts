import { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';

import { ALGOLIA_MODULE, type ProductInput } from '../../../../../modules/algolia';
import AlgoliaModuleService from '../../../../../modules/algolia/service';
import { syncProductsWorkflow } from '../../../../../workflows/algolia/sync-products';

export async function POST(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  const { language } = req.params;
  const algoliaService: AlgoliaModuleService = req.scope.resolve(ALGOLIA_MODULE);

  let hasMore = true;
  let offset = 0;
  const limit = 50;
  let totalIndexed = 0;

  try {
    while (hasMore) {
      const {
        result: { products, metadata },
      } = await syncProductsWorkflow(req.scope).run({
        input: {
          limit,
          offset,
        },
      });

      if (products && products.length > 0) {
        const indexName = language && language !== 'pt' ? `products_${language}` : 'products';
        await algoliaService.indexProducts(products as unknown as ProductInput[], language || 'pt', indexName);
        totalIndexed += products.length;
      }

      hasMore = offset + limit < (metadata?.count ?? 0);
      offset += limit;
    }

    res.json({
      message: `Successfully indexed ${totalIndexed} products in language: ${language || 'pt'}`,
      totalIndexed,
      language: language || 'pt',
    });
  } catch (error) {
    res.status(500).json({
      message: 'Error during Algolia sync',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
