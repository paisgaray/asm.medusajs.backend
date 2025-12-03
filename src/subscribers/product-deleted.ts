import type { SubscriberArgs, SubscriberConfig } from '@medusajs/framework';

import { deleteProductFromIndexWorkflow } from '../workflows/algolia';

export default async function productDeletedHandler({ event: { data }, container }: SubscriberArgs<{ id: string }>) {
  await deleteProductFromIndexWorkflow(container).run({
    input: {
      product_id: data.id,
    },
  });
}

export const config: SubscriberConfig = {
  event: 'product.deleted',
};
