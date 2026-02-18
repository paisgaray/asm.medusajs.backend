import { type SubscriberArgs, type SubscriberConfig } from '@medusajs/framework';
import { IProductModuleService } from '@medusajs/framework/types';
import { Modules } from '@medusajs/framework/utils';

import { ALGOLIA_MODULE } from '../modules/algolia';
import { areSubscribersEnabled } from '../modules/algolia/feature-flags';
import {
  isOperationIdempotent,
  markOperationAsExecuted,
  recordAlgoliaRequest,
  shouldFailFast,
} from '../modules/algolia/guards';
import AlgoliaModuleService from '../modules/algolia/service';
import { BUNDLED_PRODUCT_MODULE } from '../modules/bundled-product';
import BundledProductModuleService from '../modules/bundled-product/service';
import { deleteProductFromIndexWorkflow } from '../workflows/algolia';
import { removeBundledProductWorkflow } from '../workflows/bundled-product/workflows/remove-bundled-product';

export default async function productDeletedHandler({ event: { data }, container }: SubscriberArgs<{ id: string }>) {
  const productService: IProductModuleService = container.resolve(Modules.PRODUCT);

  const [product] = await productService.listProducts({ id: data.id }, { withDeleted: true, select: ['metadata'] });

  if (product.metadata?.bundle_id) {
    const bundledProductService: BundledProductModuleService = container.resolve(BUNDLED_PRODUCT_MODULE);

    const [bundled] = await bundledProductService.listBundles({ id: product.metadata.bundle_id }, { select: ['id'] });

    if (bundled) {
      await removeBundledProductWorkflow(container).run({ input: { id: product.metadata.bundle_id as string } });
    }
  }

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
