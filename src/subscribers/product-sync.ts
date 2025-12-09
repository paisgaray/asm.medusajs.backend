import { SubscriberArgs, type SubscriberConfig } from '@medusajs/framework';

import { ALGOLIA_MODULE } from '../modules/algolia';
import AlgoliaModuleService from '../modules/algolia/service';
import { indexProductWorkflow } from '../workflows/algolia/index-product';

export default async function handleProductEvents({ event: { data }, container }: SubscriberArgs<{ id: string }>) {
  const algoliaService: AlgoliaModuleService = container.resolve(ALGOLIA_MODULE);
  const logger = container.resolve('logger');
  const supportedLanguages = algoliaService.getSupportedLanguages();

  for (const language of supportedLanguages) {
    try {
      await indexProductWorkflow(container).run({
        input: {
          product_id: data.id,
          language,
        },
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`Failed to index product ${data.id} in language ${language}: ${errorMessage}`);
    }
  }
}

export const config: SubscriberConfig = {
  event: ['product.created', 'product.updated'],
};
