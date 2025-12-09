import type { SubscriberArgs, SubscriberConfig } from '@medusajs/framework';

import { ALGOLIA_MODULE } from '../modules/algolia';
import AlgoliaModuleService from '../modules/algolia/service';
import { deleteProductFromIndexWorkflow } from '../workflows/algolia';

export default async function productDeletedHandler({ event: { data }, container }: SubscriberArgs<{ id: string }>) {
  const algoliaService: AlgoliaModuleService = container.resolve(ALGOLIA_MODULE);
  const logger = container.resolve('logger');
  const supportedLanguages = algoliaService.getSupportedLanguages();

  for (const language of supportedLanguages) {
    try {
      await deleteProductFromIndexWorkflow(container).run({
        input: {
          product_id: data.id,
          language,
        },
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`Failed to delete product ${data.id} from index in language ${language}: ${errorMessage}`);
    }
  }
}

export const config: SubscriberConfig = {
  event: 'product.deleted',
};
