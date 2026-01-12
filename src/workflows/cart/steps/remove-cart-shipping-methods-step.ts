import { ContainerRegistrationKeys, Modules } from '@medusajs/framework/utils';
import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk';

export type RemoveCartShippingMethodsStepInput = {
  cart_id: string;
};

export const removeCartShippingMethodsStep = createStep(
  'remove-cart-shipping-methods-step',
  async (input: RemoveCartShippingMethodsStepInput, { container }) => {
    const query = container.resolve(ContainerRegistrationKeys.QUERY);
    const cartModule = container.resolve(Modules.CART);

    // Get existing shipping methods
    const { data: existingMethods } = await query.graph({
      entity: 'shipping_method',
      fields: ['id'],
      filters: { cart_id: input.cart_id },
    });

    const deletedIds: string[] = [];

    if (existingMethods && existingMethods.length > 0) {
      const methodIds = existingMethods.map((m) => m.id);
      await cartModule.softDeleteShippingMethods(methodIds);
      deletedIds.push(...methodIds);
    }

    return new StepResponse({ deleted_ids: deletedIds }, { deleted_ids: deletedIds });
  },
  async (compensateInput, { container }) => {
    if (!compensateInput?.deleted_ids || compensateInput.deleted_ids.length === 0) {
      return;
    }

    const cartModule = container.resolve(Modules.CART);

    // Restore the deleted shipping methods
    await cartModule.restoreShippingMethods(compensateInput.deleted_ids);
  },
);
