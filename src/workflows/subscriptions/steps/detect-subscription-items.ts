import { OrderDTO, OrderLineItemDTO, ProductDTO, ProductTagDTO } from '@medusajs/framework/types';
import { StepResponse, createStep } from '@medusajs/framework/workflows-sdk';

export type SubscriptionItem = {
  product_id: string;
  product_title: string;
  variant_id: string;
  quantity: number;
  unit_price: number;
  currency_code: string;
  frequency?: string;
  item: OrderLineItemDTO;
};

export type DetectSubscriptionItemsOutput = {
  has_subscriptions: boolean;
  subscription_items: SubscriptionItem[];
  one_time_items: OrderLineItemDTO[];
};

type DetectSubscriptionItemsInput = {
  order: OrderDTO & { items: OrderLineItemDTO[] };
};

/**
 * Detects subscription items in an order by checking for 'subscription' tag
 * Groups items by subscription product and separates one-time items
 */
export const detectSubscriptionItemsStep = createStep(
  'detect-subscription-items',
  async (
    { order }: DetectSubscriptionItemsInput,
    { container },
  ): Promise<StepResponse<DetectSubscriptionItemsOutput>> => {
    const query = container.resolve('query');
    const logger = container.resolve('logger');

    logger.info(`Detecting subscription items in order ${order.id}`);

    const subscriptionGroups = new Map<string, SubscriptionItem>();
    const oneTimeItems: OrderLineItemDTO[] = [];

    // Process each item in the order
    for (const item of order.items || []) {
      const productId = item.product_id;
      const variantId = item.variant_id;

      if (!productId) {
        oneTimeItems.push(item);
        continue;
      }

      // Fetch product with tags
      const { data: products } = await query.graph({
        entity: 'product',
        fields: ['id', 'title', 'tags.*'],
        filters: { id: productId },
      });

      const product = products[0] as ProductDTO & { tags?: ProductTagDTO[] };

      if (!product) {
        logger.warn(`Product ${productId} not found for item ${item.id}`);
        oneTimeItems.push(item);
        continue;
      }

      // Check if product has 'subscription' tag
      const hasSubscriptionTag = item.metadata?.is_subscription;

      if (hasSubscriptionTag) {
        // One subscription per line item
        subscriptionGroups.set(item.id, {
          product_id: productId,
          product_title: product.title,
          variant_id: variantId,
          quantity: item.quantity,
          unit_price: item.unit_price,
          currency_code: order.currency_code,
          frequency: (item.metadata?.frequency as string) ?? undefined,
          item,
        });
      } else {
        // Regular one-time item
        oneTimeItems.push(item);
      }
    }

    const subscriptionItems = Array.from(subscriptionGroups.values());

    logger.info(`Found ${subscriptionItems.length} subscription items and ${oneTimeItems.length} one-time items`);

    return new StepResponse({
      has_subscriptions: subscriptionItems.length > 0,
      subscription_items: subscriptionItems,
      one_time_items: oneTimeItems,
    });
  },
);
