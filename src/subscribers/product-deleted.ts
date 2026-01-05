import type { SubscriberArgs, SubscriberConfig } from '@medusajs/framework';

import { ALGOLIA_MODULE } from '../modules/algolia';
import { areSubscribersEnabled } from '../modules/algolia/feature-flags';
import {
  isOperationIdempotent,
  markOperationAsExecuted,
  recordAlgoliaRequest,
  shouldFailFast,
} from '../modules/algolia/guards';
import AlgoliaModuleService from '../modules/algolia/service';
import { deleteProductFromIndexWorkflow } from '../workflows/algolia';

export default async function productDeletedHandler({ event: { data }, container }: SubscriberArgs<{ id: string }>) {
  if (!areSubscribersEnabled()) {
    return;
  }

  if (await shouldFailFast(container)) {
    return;
  }

  const algoliaService: AlgoliaModuleService = container.resolve(ALGOLIA_MODULE);
  const supportedLanguages = algoliaService.getSupportedLanguages();

  for (const language of supportedLanguages) {
    const isIdempotent = await isOperationIdempotent(container, data.id, language, 'delete');
    if (isIdempotent) {
      continue;
    }

    try {
      await deleteProductFromIndexWorkflow(container).run({
        input: {
          product_id: data.id,
          language,
        },
      });

      await markOperationAsExecuted(container, data.id, language, 'delete');
      await recordAlgoliaRequest(container, 'delete', 1);
    } catch {
      // ignore
    }
  }
}

export const config: SubscriberConfig = {
  event: 'product.deleted',
};
