import { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';

import { ALGOLIA_MODULE } from '../../../modules/algolia';
import AlgoliaModuleService from '../../../modules/algolia/service';
import { autocompleteWorkflow } from '../../../workflows/algolia';

export async function GET(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  const query = (req.query.q as string) || '';
  const limit = req.query.limit ? Number(req.query.limit) : 5;
  const filters = (req.query.filters as string) || '';
  const languageParam = (req.query.language as string) || undefined;

  const algoliaService: AlgoliaModuleService = req.scope.resolve(ALGOLIA_MODULE);

  if (languageParam && !algoliaService.isLanguageSupported(languageParam)) {
    res.status(400).json({
      message: `Language '${languageParam}' is not supported. Supported languages: ${algoliaService.getSupportedLanguages().join(', ')}`,
    });
    return;
  }

  const validatedLanguage = algoliaService.validateLanguage(languageParam);

  const { result } = await autocompleteWorkflow(req.scope).run({
    input: {
      query,
      limit,
      filters,
      language: validatedLanguage,
    },
  });

  res.json({
    suggestions: result?.suggestions || [],
  });
}
