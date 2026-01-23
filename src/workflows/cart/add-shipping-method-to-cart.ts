import { createWorkflow, WorkflowResponse } from '@medusajs/framework/workflows-sdk';

import { addCartShippingMethodStep } from './steps/add-cart-shipping-method-step';
import { removeCartShippingMethodsStep } from './steps/remove-cart-shipping-methods-step';
import { retrieveCartStep } from './steps/retrieve-cart-step';
import { retrieveCartWithRelationsStep } from './steps/retrieve-cart-with-relations-step';
import { retrieveShippingOptionStep } from './steps/retrieve-shipping-option-step';

type AddShippingMethodToCartWorkflowInput = {
  cart_id: string;
  option_id: string;
};

/**
 * Workflow to add a shipping method to a cart.
 * This bypasses the geo zone validation that would normally fail for
 * regions without countries by directly manipulating the cart module.
 */
export const addShippingMethodToCartWorkflow = createWorkflow(
  'add-shipping-method-to-cart-workflow',
  (input: AddShippingMethodToCartWorkflowInput) => {
    // Step 1: Retrieve and validate cart
    const cart = retrieveCartStep({
      cart_id: input.cart_id,
    });

    // Step 2: Retrieve shipping option and its price
    const shippingOption = retrieveShippingOptionStep({
      option_id: input.option_id,
      currency_code: cart.currency_code,
    });

    // Step 3: Remove existing shipping methods
    removeCartShippingMethodsStep({
      cart_id: input.cart_id,
    });

    // Step 4: Add new shipping method
    const shippingMethod = addCartShippingMethodStep({
      cart_id: input.cart_id,
      shipping_option_id: shippingOption.id,
      shipping_option_name: shippingOption.name,
      amount: shippingOption.amount,
    });

    // Step 5: Retrieve updated cart with all relations
    const updatedCart = retrieveCartWithRelationsStep({
      cart_id: input.cart_id,
    });

    return new WorkflowResponse({
      cart: updatedCart,
      shipping_method: shippingMethod,
    });
  },
);
