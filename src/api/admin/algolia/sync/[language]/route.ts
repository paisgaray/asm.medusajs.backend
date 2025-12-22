import { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';

import { ALGOLIA_MODULE } from '../../../../../modules/algolia';
import AlgoliaModuleService from '../../../../../modules/algolia/service';
import { syncProductsWorkflow } from '../../../../../workflows/algolia/sync-products';

export async function POST(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  const { language } = req.params;
  const algoliaService: AlgoliaModuleService = req.scope.resolve(ALGOLIA_MODULE);

  const validatedLanguage = algoliaService.validateLanguage(language);
  const skipClear =
    req.query.skipClear === 'true' ||
    (req.body && typeof req.body === 'object' && 'skipClear' in req.body && req.body.skipClear === true);

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
  let clearSkipped = false;

  try {
    if (!skipClear) {
      try {
        await algoliaService.clearIndex(validatedLanguage);
      } catch (clearError) {
        const errorMessage = clearError instanceof Error ? clearError.message : String(clearError);
        const lowerMessage = errorMessage.toLowerCase();
        const isBlocked =
          lowerMessage.includes('blocked') ||
          lowerMessage.includes('cannot be processed') ||
          lowerMessage.includes('contact us to unblock') ||
          lowerMessage.includes('contact algolia support');

        if (isBlocked) {
          clearSkipped = true;
        } else {
          throw clearError;
        }
      }
    } else {
      clearSkipped = true;
    }

    while (hasMore) {
      try {
        const workflowResult = await syncProductsWorkflow(req.scope).run({
          input: {
            limit,
            offset,
            language: validatedLanguage,
          },
        });

        if (!workflowResult?.result) {
          throw new Error('Workflow returned no result');
        }

        const { products, metadata } = workflowResult.result;

        if (products && products.length > 0) {
          totalIndexed += products.length;
        }

        hasMore = offset + limit < (metadata?.count ?? 0);
        offset += limit;
      } catch (workflowError) {
        throw new Error(
          `Error in sync workflow at offset ${offset}: ${
            workflowError instanceof Error ? workflowError.message : String(workflowError)
          }`,
        );
      }
    }

    const message = clearSkipped
      ? `Successfully indexed ${totalIndexed} products in language: ${validatedLanguage} (index clear was skipped)`
      : `Successfully indexed ${totalIndexed} products in language: ${validatedLanguage}`;

    res.json({
      message,
      totalIndexed,
      language: validatedLanguage,
      clearSkipped,
    });
  } catch (error) {
    let errorMessage = 'Unknown error';
    let errorStack: string | undefined;

    if (error instanceof Error) {
      errorMessage = error.message || errorMessage;
      errorStack = error.stack;
    } else if (error && typeof error === 'object') {
      if ('message' in error && typeof error.message === 'string') {
        errorMessage = error.message;
      } else if ('error' in error && typeof error.error === 'string') {
        errorMessage = error.error;
      } else {
        errorMessage = JSON.stringify(error);
      }
    }

    const lowerMessage = errorMessage.toLowerCase();
    const isBlocked =
      lowerMessage.includes('blocked') ||
      lowerMessage.includes('cannot be processed') ||
      lowerMessage.includes('contact us to unblock') ||
      lowerMessage.includes('contact algolia support');

    if (isBlocked) {
      res.status(503).json({
        message: 'Algolia application is blocked',
        error: errorMessage,
        suggestion:
          'Please contact Algolia support to unblock your application. You can also try syncing with ?skipClear=true to skip clearing the index.',
      });
    } else {
      res.status(500).json({
        message: 'Error during Algolia sync',
        error: errorMessage,
        stack: errorStack,
      });
    }
  }
}
