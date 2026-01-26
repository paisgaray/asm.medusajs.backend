import { MedusaError, ContainerRegistrationKeys } from '@medusajs/framework/utils';
import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk';

export type DeletePaymentMethodStepInput = {
  payment_method_id: string;
  account_holder_id: string;
};

export const deletePaymentMethodStep = createStep(
  'delete-payment-method-step',
  async (input: DeletePaymentMethodStepInput, { container }) => {
    const query = container.resolve(ContainerRegistrationKeys.QUERY);
    const paymentModuleService = container.resolve('payment') as {
      deletePaymentMethod: (params: {
        provider_id: string;
        payment_method_id: string;
        context: {
          account_holder: {
            data: {
              id: string;
            };
          };
        };
      }) => Promise<void>;
    };

    const { data: accountHolders } = await query.graph({
      entity: 'account_holder',
      fields: ['id', 'provider_id', 'data'],
      filters: {
        id: input.account_holder_id,
      },
    });

    if (!accountHolders || accountHolders.length === 0) {
      throw new MedusaError(MedusaError.Types.NOT_FOUND, 'Account holder not found');
    }

    const accountHolder = accountHolders[0] as {
      id: string;
      provider_id: string;
      data: {
        id: string;
      };
    };

    await paymentModuleService.deletePaymentMethod({
      provider_id: accountHolder.provider_id,
      payment_method_id: input.payment_method_id,
      context: {
        account_holder: {
          data: {
            id: accountHolder.data.id,
          },
        },
      },
    });

    return new StepResponse({ success: true });
  },
);
