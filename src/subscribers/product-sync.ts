import { SubscriberArgs, type SubscriberConfig } from '@medusajs/framework';

import { indexProductWorkflow } from '../workflows/algolia/index-product';

export default async function handleProductEvents({ event: { data }, container }: SubscriberArgs<{ id: string }>) {
  await indexProductWorkflow(container).run({
    input: {
      product_id: data.id,
    },
  });
}

export const config: SubscriberConfig = {
  event: ['product.created', 'product.updated'],
};
