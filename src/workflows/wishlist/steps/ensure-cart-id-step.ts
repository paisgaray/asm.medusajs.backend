import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk';
import { createCartWorkflow } from '@medusajs/medusa/core-flows';

type EnsureCartIdStepInput = {
  cart_id?: string;
  region_id?: string;
};

type EnsureCartIdStepOutput = {
  cart_id: string;
  created: boolean;
};

export const ensureCartIdStep = createStep(
  'ensure-cart-id-step',
  async (input: EnsureCartIdStepInput, { container }) => {
    if (input.cart_id) {
      return new StepResponse<EnsureCartIdStepOutput>({
        cart_id: input.cart_id,
        created: false,
      });
    }

    const workflow = createCartWorkflow(container);
    const { result: cartResult } = await workflow.run({
      input: {
        region_id: input.region_id,
      },
    });

    return new StepResponse<EnsureCartIdStepOutput>({
      cart_id: cartResult.id,
      created: true,
    });
  },
);
