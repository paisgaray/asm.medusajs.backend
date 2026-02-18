import { ContainerRegistrationKeys } from '@medusajs/framework/utils';
import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk';

export type UpdatePaymentMethodStepInput = {
  payment_method_id: string;
  account_holder_id: string;
  metadata?: Record<string, unknown>;
};

export const updatePaymentMethodStep = createStep(
  'update-payment-method-step',
  async (input: UpdatePaymentMethodStepInput, { container }) => {
    const paymentModuleService = container.resolve('payment') as {
      updatePaymentMethod?: (params: {
        provider_id: string;
        payment_method_id: string;
        context: {
          account_holder: {
            data: {
              id: string;
            };
          };
        };
        metadata?: Record<string, unknown>;
      }) => Promise<void>;
    };

    const query = container.resolve(ContainerRegistrationKeys.QUERY);
    const { data: accountHolders } = await query.graph({
      entity: 'account_holder',
      fields: ['id', 'provider_id', 'data'],
      filters: {
        id: input.account_holder_id,
      },
    });

    if (!accountHolders || accountHolders.length === 0) {
      throw new Error('Account holder not found');
    }

    const accountHolder = accountHolders[0] as {
      id: string;
      provider_id: string;
      data: {
        id?: string;
      };
    };

    if (paymentModuleService.updatePaymentMethod) {
      await paymentModuleService.updatePaymentMethod({
        provider_id: accountHolder.provider_id,
        payment_method_id: input.payment_method_id,
        context: {
          account_holder: {
            data: {
              id: accountHolder.data.id,
            },
          },
        },
        metadata: input.metadata,
      });
    }

    return new StepResponse({ success: true });
  },
);
