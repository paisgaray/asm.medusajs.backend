import { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';

import { ALGOLIA_MODULE } from '../../../../../modules/algolia';
import AlgoliaModuleService from '../../../../../modules/algolia/service';
import { syncProductsWorkflow } from '../../../../../workflows/algolia/sync-products';

export async function POST(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  const { language } = req.params;
  const algoliaService: AlgoliaModuleService = req.scope.resolve(ALGOLIA_MODULE);

  const validatedLanguage = algoliaService.validateLanguage(language);

  if (language && !algoliaService.isLanguageSupported(language)) {
    res.status(400).json({
      message: `Language '${language}' is not supported. Supported languages: ${algoliaService.getSupportedLanguages().join(', ')}`,
    });
    return;
  }

  let hasMore = true;
  let offset = 0;
  const limit = 50;
  let totalIndexed = 0;

  try {
    await algoliaService.clearIndex(validatedLanguage);

    while (hasMore) {
      const {
        result: { products, metadata },
      } = await syncProductsWorkflow(req.scope).run({
        input: {
          limit,
          offset,
          language: validatedLanguage,
        },
      });

      if (products && products.length > 0) {
        totalIndexed += products.length;
      }

      hasMore = offset + limit < (metadata?.count ?? 0);
      offset += limit;
    }

    res.json({
      message: `Successfully indexed ${totalIndexed} products in language: ${validatedLanguage}`,
      totalIndexed,
      language: validatedLanguage,
    });
  } catch (error) {
    res.status(500).json({
      message: 'Error during Algolia sync',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
