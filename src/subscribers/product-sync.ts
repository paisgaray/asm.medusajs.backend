import { SubscriberArgs, type SubscriberConfig } from '@medusajs/framework';

import { ALGOLIA_MODULE } from '../modules/algolia';
import { areSubscribersEnabled } from '../modules/algolia/feature-flags';
import {
  isOperationIdempotent,
  markOperationAsExecuted,
  recordAlgoliaRequest,
  shouldFailFast,
} from '../modules/algolia/guards';
import AlgoliaModuleService from '../modules/algolia/service';
import { indexProductWorkflow } from '../workflows/algolia/index-product';

export default async function handleProductEvents({ event: { data }, container }: SubscriberArgs<{ id: string }>) {
  if (!areSubscribersEnabled()) {
    return;
  }

  if (await shouldFailFast(container)) {
    return;
  }

  const algoliaService: AlgoliaModuleService = container.resolve(ALGOLIA_MODULE);
  const supportedLanguages = algoliaService.getSupportedLanguages();

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

  for (const language of supportedLanguages) {
    const isIdempotent = await isOperationIdempotent(container, data.id, language, 'index');
    if (isIdempotent) {
      continue;
    }

    try {
      await indexProductWorkflow(container).run({
        input: {
          product_id: data.id,
          language,
          region_id: regionId,
          currency_code: currencyCode,
        },
      });

      await markOperationAsExecuted(container, data.id, language, 'index');
      await recordAlgoliaRequest(container, 'index', 1);
    } catch {
      // ignore
    }
  }
}

export const config: SubscriberConfig = {
  event: ['product.created', 'product.updated'],
};
