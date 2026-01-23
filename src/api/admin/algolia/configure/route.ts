import { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';

import { ALGOLIA_MODULE } from '../../../../modules/algolia';
import AlgoliaModuleService from '../../../../modules/algolia/service';

/**
 * Configura os índices do Algolia com os settings necessários
 * POST /admin/algolia/configure
 */
export async function POST(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  const algoliaService: AlgoliaModuleService = req.scope.resolve(ALGOLIA_MODULE);

  try {
    const supportedLanguages = algoliaService.getSupportedLanguages();
    const results = [];

    // Configurar índice padrão (ES)
    await algoliaService.configureIndex();
    results.push({ language: 'es', index: await algoliaService.getIndexName('product'), status: 'configured' });

    // Configurar índices para outros idiomas
    for (const lang of supportedLanguages) {
      if (lang !== 'es') {
        await algoliaService.configureIndex(lang);
        results.push({
          language: lang,
          index: await algoliaService.getIndexName('product', lang),
          status: 'configured',
        });
      }
    }

    res.json({
      message: 'Índices configurados com sucesso',
      results,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      message: 'Erro ao configurar índices',
      error: errorMessage,
    });
  }
}
