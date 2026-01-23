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
      error: `Sync for language '${validatedLanguage}' was executed recently. Please wait at least 1 minute between syncs.`,
      retryAfter: Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000),
      resetAt: new Date(rateLimitResult.resetAt).toISOString(),
    });
    return;
  }

  const lockKey = `sync:${validatedLanguage}`;
  const lockResult = await acquireLock(req.scope, lockKey);

  if (!lockResult.acquired) {
    res.status(409).json({
      message: 'Sync already in progress',
      error: `A sync operation for language '${validatedLanguage}' is already running. Please wait for it to complete.`,
    });
    return;
  }

  const ownerId = lockResult.ownerId;

  const syncStartTime = Date.now();
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

    let regionId: string | undefined;
    let currencyCode = 'eur';

    try {
      const regionModule = req.scope.resolve('region');
      const regions = await regionModule.listRegions({});
      if (regions && regions.length > 0) {
        regionId = regions[0].id;
        currencyCode = regions[0].currency_code || 'eur';
      }
    } catch {}

    while (hasMore) {
      try {
        const workflowResult = await syncProductsWorkflow(req.scope).run({
          input: {
            limit,
            offset,
            language: validatedLanguage,
            region_id: regionId,
            currency_code: currencyCode,
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
      ? `Successfully indexed ${totalIndexed} products in language: ${validatedLanguage} (index clear was skipped)`
      : `Successfully indexed ${totalIndexed} products in language: ${validatedLanguage}`;

    res.json({
      message,
      totalIndexed,
      language: validatedLanguage,
      clearSkipped,
      totalRequests,
      duration: Date.now() - syncStartTime,
    });
  } catch (error) {
    await releaseLock(req.scope, lockKey, ownerId);

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
  } finally {
    await releaseLock(req.scope, lockKey, ownerId);
  }
}
