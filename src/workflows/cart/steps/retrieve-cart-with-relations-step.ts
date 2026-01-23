import { ContainerRegistrationKeys } from '@medusajs/framework/utils';
import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk';

export type RetrieveCartWithRelationsStepInput = {
  cart_id: string;
};

export const retrieveCartWithRelationsStep = createStep(
  'retrieve-cart-with-relations-step',
  async (input: RetrieveCartWithRelationsStepInput, { container }) => {
    const query = container.resolve(ContainerRegistrationKeys.QUERY);

    const { data: carts } = await query.graph({
      entity: 'cart',
      fields: [
        'id',
        'region_id',
        'shipping_address.*',
        'billing_address.*',
        'items.*',
        'shipping_methods.*',
        'shipping_methods.shipping_option_id',
        'shipping_methods.amount',
      ],
      filters: { id: input.cart_id },
    });

    if (!carts || carts.length === 0) {
      throw new Error(`Cart with id ${input.cart_id} not found`);
    }

    return new StepResponse(carts[0]);
  },
);
