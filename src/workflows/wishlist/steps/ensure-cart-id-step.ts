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

    if (input.region_id) {
      try {
        const { result: cartResult } = await workflow.run({
          input: {
            region_id: input.region_id,
          },
        });

        return new StepResponse<EnsureCartIdStepOutput>({
          cart_id: cartResult.id,
          created: true,
        });
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
        if (
          errorMessage.includes('region') ||
          errorMessage.includes('no regions') ||
          (error && typeof error === 'object' && 'type' in error && String(error.type) === 'not_found')
        ) {
          const { result: cartResult } = await workflow.run({
            input: {},
          });

          return new StepResponse<EnsureCartIdStepOutput>({
            cart_id: cartResult.id,
            created: true,
          });
        }
        throw error;
      }
    }

    const { result: cartResult } = await workflow.run({
      input: {},
    });

    return new StepResponse<EnsureCartIdStepOutput>({
      cart_id: cartResult.id,
      created: true,
    });
  },
);
