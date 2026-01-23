import { SubscriberArgs, type SubscriberConfig } from '@medusajs/framework';

import { ALGOLIA_MODULE } from '../modules/algolia';
import { areSubscribersEnabled } from '../modules/algolia/feature-flags';
import {
  acquireLock,
  releaseLock,
  canExecuteSync,
  recordAlgoliaRequest,
  shouldFailFast,
} from '../modules/algolia/guards';
import AlgoliaModuleService from '../modules/algolia/service';
import { syncProductsWorkflow } from '../workflows/algolia/sync-products';

export default async function algoliaSyncHandler({ container }: SubscriberArgs) {
  if (!areSubscribersEnabled()) {
    return;
  }

  if (await shouldFailFast(container)) {
    return;
  }

  const algoliaService: AlgoliaModuleService = container.resolve(ALGOLIA_MODULE);
  const defaultLanguage = algoliaService.getSupportedLanguages()[0] || 'pt';

  const rateLimitResult = await canExecuteSync(container, defaultLanguage);
  if (!rateLimitResult.allowed) {
    return;
  }

  const lockKey = `sync:${defaultLanguage}`;
  const lockResult = await acquireLock(container, lockKey);

  if (!lockResult.acquired) {
    return;
  }

  const ownerId = lockResult.ownerId;
  let hasMore = true;
  let offset = 0;
  const limit = 100;

  let regionId: string | undefined;
  let currencyCode = 'eur';

  try {
    const regionModule = container.resolve('region');
    const regions = await regionModule.listRegions({});
    if (regions && regions.length > 0) {
      regionId = regions[0].id;
      currencyCode = regions[0].currency_code || 'eur';
    }
  } catch {}

  try {
    while (hasMore) {
      const {
        result: { products, metadata },
      } = await syncProductsWorkflow(container).run({
        input: {
          limit,
          offset,
          language: defaultLanguage,
          region_id: regionId,
          currency_code: currencyCode,
        },
      });

      if (products && products.length > 0) {
        await recordAlgoliaRequest(container, 'index', 1);
      }

      hasMore = offset + limit < (metadata?.count ?? 0);
      offset += limit;
    }
  } finally {
    await releaseLock(container, lockKey, ownerId);
  }
}

export const config: SubscriberConfig = {
  event: 'algolia.sync',
};
