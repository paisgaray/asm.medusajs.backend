import { type SubscriberArgs, type SubscriberConfig } from '@medusajs/framework';
import { IProductModuleService } from '@medusajs/framework/types';
import { Modules } from '@medusajs/framework/utils';

import { removeBundledProductWorkflow } from '../../workflows/bundled-product/workflows/remove-bundled-product';

export default async function bundledProductDeletedHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const productService: IProductModuleService = container.resolve(Modules.PRODUCT);

  const [product] = await productService.listProducts({ id: data.id }, { withDeleted: true, select: ['metadata'] });

  if (product.metadata?.bundle_id) {
    await removeBundledProductWorkflow(container).run({ input: { id: product.metadata.bundle_id as string } });
  }
}

export const config: SubscriberConfig = {
  event: 'product.deleted',
};
