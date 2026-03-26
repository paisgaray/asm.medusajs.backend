import { FilterablePaymentMethodProps, IPaymentModuleService, PaymentMethodDTO } from '@medusajs/framework/types';
import { Modules } from '@medusajs/framework/utils';
import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk';

import { AccountHolderData } from './get-customer-account-holders-step';

export type ListPaymentMethodsStepInput = {
  account_holders: AccountHolderData[];
};

export const listPaymentMethodsStep = createStep(
  'list-payment-methods-step',
  async (input: ListPaymentMethodsStepInput, { container }) => {
    if (!input.account_holders || input.account_holders.length === 0) {
      return new StepResponse([]);
    }

    const paymentModuleService = container.resolve<IPaymentModuleService>(Modules.PAYMENT);

    const allPaymentMethods: Array<PaymentMethodDTO & { account_holder_id: string }> = [];

    for (const accountHolder of input.account_holders) {
      if (!accountHolder.provider_id || !accountHolder.data?.id) {
        continue;
      }

      const filters: FilterablePaymentMethodProps = {
        provider_id: accountHolder.provider_id,
        context: {
          account_holder: {
            data: accountHolder.data,
          },
        },
      };

      const paymentMethods = await paymentModuleService.listPaymentMethods(filters);

      for (const method of paymentMethods) {
        allPaymentMethods.push({ ...method, account_holder_id: accountHolder.id });
      }
    }

    return new StepResponse(allPaymentMethods);
  },
);
