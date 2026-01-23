import { ContainerRegistrationKeys } from '@medusajs/framework/utils';
import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk';

export type RetrieveCartStepInput = {
  cart_id: string;
};

export type CartData = {
  id: string;
  region_id: string;
  currency_code: string;
};

export const retrieveCartStep = createStep(
  'retrieve-cart-step',
  async (input: RetrieveCartStepInput, { container }) => {
    const query = container.resolve(ContainerRegistrationKeys.QUERY);

    const { data: carts } = await query.graph({
      entity: 'cart',
      fields: ['id', 'region_id', 'currency_code'],
      filters: { id: input.cart_id },
    });

    if (!carts || carts.length === 0) {
      throw new Error(`Cart with id ${input.cart_id} not found`);
    }

    const cart: CartData = carts[0];

    return new StepResponse(cart);
  },
);
