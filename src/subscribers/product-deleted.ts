import type { SubscriberArgs, SubscriberConfig } from '@medusajs/framework';

import { deleteProductFromIndexWorkflow } from '../workflows/algolia';

export default async function productDeletedHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const productId = data.id;

  await deleteProductFromIndexWorkflow(container).run({
    input: {
      product_id: productId,
    },
  });
}

export const config: SubscriberConfig = {
  event: 'product.deleted',
};

