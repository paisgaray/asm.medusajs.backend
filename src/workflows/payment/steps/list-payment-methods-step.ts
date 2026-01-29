import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk';

import { AccountHolderData } from './get-customer-account-holders-step';

export type ListPaymentMethodsStepInput = {
  account_holders: AccountHolderData[];
};

export type PaymentMethod = {
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

export const listPaymentMethodsStep = createStep(
  'list-payment-methods-step',
  async (input: ListPaymentMethodsStepInput, { container }) => {
    if (!input.account_holders || input.account_holders.length === 0) {
      return new StepResponse([]);
    }

    const paymentModuleService = container.resolve('payment') as {
      listPaymentMethods?: (params: {
        provider_id: string;
        context: {
          account_holder: {
            data: {
              id: string;
            };
          };
        };
      }) => Promise<PaymentMethod[]>;
    };

    if (!paymentModuleService || !paymentModuleService.listPaymentMethods) {
      return new StepResponse([]);
    }

    const allPaymentMethods: Array<PaymentMethod & { account_holder_id: string }> = [];

    for (const accountHolder of input.account_holders) {
      if (!accountHolder.provider_id || !accountHolder.data?.id) {
        continue;
      }

      try {
        const paymentMethods = await paymentModuleService.listPaymentMethods({
          provider_id: accountHolder.provider_id,
          context: {
            account_holder: {
              data: {
                id: accountHolder.data.id,
              },
            },
          },
        });

        if (paymentMethods && Array.isArray(paymentMethods)) {
          for (const method of paymentMethods) {
            allPaymentMethods.push({
              ...method,
              account_holder_id: accountHolder.id,
            });
          }
        }
      } catch {
        continue;
      }
    }

    return new StepResponse(allPaymentMethods);
  },
);
