import { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';

import { ALGOLIA_MODULE } from '../../../../../modules/algolia';
import { isSyncEnabled, isClearIndexEnabled } from '../../../../../modules/algolia/feature-flags';
import {
  acquireLock,
  releaseLock,
  canExecuteSync,
  recordAlgoliaRequest,
  shouldFailFast,
} from '../../../../../modules/algolia/guards';
import AlgoliaModuleService from '../../../../../modules/algolia/service';
import { syncProductsWorkflow } from '../../../../../workflows/algolia/sync-products';

/**
 * Rota pública de sync do Algolia (via store para não precisar de autenticação admin)
 * 
 * Uso:
 * POST /store/algolia/sync/pt
 * POST /store/algolia/sync/pt?skipClear=true
 */
export async function POST(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  const { language } = req.params;
  const algoliaService: AlgoliaModuleService = req.scope.resolve(ALGOLIA_MODULE);

  if (!isSyncEnabled()) {
    res.status(503).json({
      message: 'Sync is disabled',
      error: 'Algolia sync is currently disabled via feature flag.',
    });
    return;
  }

  if (await shouldFailFast(req.scope)) {
    res.status(503).json({
      message: 'Service temporarily unavailable',
      error: 'Algolia request rate exceeded threshold. Please try again later.',
      retryAfter: 60,
    });
    return;
  }

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

  const rateLimitResult = await canExecuteSync(req.scope, validatedLanguage);
  if (!rateLimitResult.allowed) {
    res.status(429).json({
      message: 'Rate limit exceeded',
      error: `Too many sync requests. Please try again after ${rateLimitResult.retryAfter} seconds.`,
      retryAfter: rateLimitResult.retryAfter,
    });
    return;
  }

  const lockKey = `sync:${validatedLanguage}`;
  const lockResult = await acquireLock(req.scope, lockKey);

  if (!lockResult.acquired) {
    res.status(409).json({
      message: 'Sync already in progress',
      error: 'Another sync operation is currently running. Please wait for it to complete.',
    });
    return;
  }

  const ownerId = lockResult.ownerId;
  let totalRequests = 0;
  let totalIndexed = 0;
  let clearSkipped = false;

  try {
    if (!skipClear && isClearIndexEnabled()) {
      const clearLockKey = `clear:${await algoliaService.getIndexName('product', validatedLanguage)}`;
      const clearLockResult = await acquireLock(req.scope, clearLockKey);

      if (!clearLockResult.acquired) {
        clearSkipped = true;
      } else {
        const clearOwnerId = clearLockResult.ownerId;
        try {
          await algoliaService.clearIndex(validatedLanguage);
          totalRequests += 1;
          await recordAlgoliaRequest(req.scope, 'clear', 1);
        } finally {
          await releaseLock(req.scope, clearLockKey, clearOwnerId);
        }
      }
    } else {
      clearSkipped = true;
    }

    let hasMore = true;
    let offset = 0;
    const limit = 100;

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
          totalRequests += 1;
          await recordAlgoliaRequest(req.scope, 'index', 1);
        }

        hasMore = offset + limit < (metadata?.count ?? 0);
        offset += limit;
      } catch (workflowError) {
        let errorMsg = 'Unknown workflow error';
        if (workflowError instanceof Error) {
          errorMsg = workflowError.message;
        } else if (workflowError && typeof workflowError === 'object') {
          try {
            errorMsg = JSON.stringify(workflowError);
          } catch {
            errorMsg = String(workflowError);
          }
        } else {
          errorMsg = String(workflowError);
        }
        throw new Error(`Error in sync workflow at offset ${offset}: ${errorMsg}`);
      }
    }

    const message = clearSkipped
      ? `Sync completed. Indexed ${totalIndexed} products (index was not cleared).`
      : `Sync completed. Cleared and indexed ${totalIndexed} products.`;

    res.json({
      message,
      totalIndexed,
      totalRequests,
      language: validatedLanguage,
      clearSkipped,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      message: 'Sync failed',
      error: errorMessage,
    });
  } finally {
    await releaseLock(req.scope, lockKey, ownerId);
  }
}
