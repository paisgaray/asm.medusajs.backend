import { Modules } from '@medusajs/framework/utils';
import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk';

export type AddCartShippingMethodStepInput = {
  cart_id: string;
  shipping_option_id: string;
  shipping_option_name: string;
  amount: number;
};

export type ShippingMethodResult = {
  id: string;
  cart_id: string;
  name: string;
  shipping_option_id: string;
  amount: number;
};

export const addCartShippingMethodStep = createStep(
  'add-cart-shipping-method-step',
  async (input: AddCartShippingMethodStepInput, { container }) => {
    const cartModule = container.resolve(Modules.CART);

    // Add new shipping method directly using cart module
    const [shippingMethod] = await cartModule.addShippingMethods([
      {
        cart_id: input.cart_id,
        name: input.shipping_option_name,
        shipping_option_id: input.shipping_option_id,
        amount: input.amount,
        data: {},
      },
    ]);

    const result: ShippingMethodResult = {
      id: shippingMethod.id,
      cart_id: shippingMethod.cart_id,
      name: shippingMethod.name,
      shipping_option_id: input.shipping_option_id,
      amount: input.amount,
    };

    return new StepResponse(result, { shipping_method_id: shippingMethod.id });
  },
  async (compensateInput, { container }) => {
    if (!compensateInput?.shipping_method_id) {
      return;
    }

    const cartModule = container.resolve(Modules.CART);

    // Remove the added shipping method
    await cartModule.softDeleteShippingMethods([compensateInput.shipping_method_id]);
  },
);
