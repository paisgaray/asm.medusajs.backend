import { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';

import { ALGOLIA_MODULE } from '../../../../../modules/algolia';
import AlgoliaModuleService from '../../../../../modules/algolia/service';

export async function POST(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  const { language } = req.params;
  const algoliaService: AlgoliaModuleService = req.scope.resolve(ALGOLIA_MODULE);

  if (!algoliaService.isLanguageSupported(language)) {
    res.status(400).json({
      message: `Language '${language}' is not supported. Supported languages: ${algoliaService.getSupportedLanguages().join(', ')}`,
    });
    return;
  }

  try {
    const indexName = await algoliaService.getIndexName('product', language);
    await algoliaService.clearIndex(language);

    res.status(200).json({
      message: `Index cleared for language '${language}'`,
      language,
      indexName,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      message: 'Failed to clear index',
      error: message,
    });
  }
}
