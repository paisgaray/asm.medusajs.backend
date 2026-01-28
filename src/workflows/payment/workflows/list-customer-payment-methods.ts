import { createWorkflow, WorkflowResponse } from '@medusajs/framework/workflows-sdk';

import { getCustomerAccountHoldersStep } from '../steps/get-customer-account-holders-step';
import { listPaymentMethodsStep } from '../steps/list-payment-methods-step';

type ListCustomerPaymentMethodsWorkflowInput = {
  customer_id: string;
};

export const listCustomerPaymentMethodsWorkflow = createWorkflow(
  'list-customer-payment-methods',
  (input: ListCustomerPaymentMethodsWorkflowInput) => {
    const accountHolders = getCustomerAccountHoldersStep({ customer_id: input.customer_id });

    const paymentMethods = listPaymentMethodsStep({ account_holders: accountHolders });

    return new WorkflowResponse({
      payment_methods: paymentMethods,
    });
  },
);
