import type { SubscriberArgs, SubscriberConfig } from '@medusajs/framework';

import { indexProductWorkflow } from '../workflows/algolia';

export default async function productUpdatedHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const productId = data.id;

  await indexProductWorkflow(container).run({
    input: {
      product_id: productId,
    },
  });
}

export const config: SubscriberConfig = {
  event: 'product.updated',
};

