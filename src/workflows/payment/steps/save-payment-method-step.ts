import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk';

import { AccountHolderData } from './get-customer-account-holders-step';

export type SavePaymentMethodStepInput = {
  account_holder: AccountHolderData;
  payment_method_id: string;
  metadata?: Record<string, unknown>;
};

export type SavedPaymentMethod = {
  id: string;
  provider_id: string;
  data: {
    card?: {
      brand: string;
      last4: string;
      exp_month: number;
      exp_year: number;
    };
  };
};

export const savePaymentMethodStep = createStep(
  'save-payment-method-step',
  async (input: SavePaymentMethodStepInput, { container }) => {
    const paymentModuleService = container.resolve('payment') as {
      savePaymentMethod?: (params: {
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
      }) => Promise<SavedPaymentMethod>;
    };

    if (!paymentModuleService || !paymentModuleService.savePaymentMethod) {
      throw new Error(
        'Payment provider does not support saving payment methods. Please ensure the provider implements savePaymentMethod method.',
      );
    }

    if (!input.account_holder.data?.id) {
      throw new Error('Account holder data is missing');
    }

    const savedMethod = await paymentModuleService.savePaymentMethod({
      provider_id: input.account_holder.provider_id,
      payment_method_id: input.payment_method_id,
      context: {
        account_holder: {
          data: {
            id: input.account_holder.data.id,
          },
        },
      },
      metadata: input.metadata,
    });

    if (!savedMethod) {
      throw new Error('Payment method was not saved');
    }

    return new StepResponse(savedMethod);
  },
);
