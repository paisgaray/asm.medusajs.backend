import { IPaymentModuleService } from '@medusajs/framework/types';
import { ContainerRegistrationKeys, Modules } from '@medusajs/framework/utils';
import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk';

import { AccountHolderData } from './get-customer-account-holders-step';

export type EnsureAccountHolderStepInput = {
  customer_id: string;
  provider_id: string;
};

export const ensureAccountHolderStep = createStep(
  'ensure-account-holder-step',
  async (input: EnsureAccountHolderStepInput, { container }) => {
    const query = container.resolve(ContainerRegistrationKeys.QUERY);
    const link = container.resolve(ContainerRegistrationKeys.LINK);

    const { data: customerData } = await query.graph(
      {
        entity: 'customer',
        fields: ['id', 'email', 'account_holders.id', 'account_holders.provider_id', 'account_holders.data'],
        filters: {
          id: input.customer_id,
        },
      },
      {
        throwIfKeyNotFound: false,
      },
    );

    if (!customerData || customerData.length === 0) {
      throw new Error('Customer not found');
    }

    const customer = customerData[0] as {
      id: string;
      email: string;
      account_holders?: Array<{ id: string; provider_id: string; data: { id?: string } }>;
    };

    const existingAccountHolder = customer.account_holders?.find(
      (ah) => ah && ah.provider_id === input.provider_id && ah.data?.id,
    );

    if (existingAccountHolder) {
      return new StepResponse({
        id: existingAccountHolder.id,
        provider_id: existingAccountHolder.provider_id,
        data: {
          id: existingAccountHolder.data.id!,
        },
      } as AccountHolderData);
    }

    const paymentModuleService = container.resolve<IPaymentModuleService>(Modules.PAYMENT);

    const accountHolderData = await paymentModuleService.createAccountHolder({
      provider_id: input.provider_id,
      context: {
        customer: {
          id: input.customer_id,
          email: customer.email,
        },
      },
    });

    if (!accountHolderData?.id) {
      throw new Error('Failed to create account holder');
    }

    await link.create([
      {
        [Modules.CUSTOMER]: { customer_id: input.customer_id },
        [Modules.PAYMENT]: {
          account_holder_id: accountHolderData.id,
        },
      },
    ]);

    const { data: createdAccountHolders } = await query.graph(
      {
        entity: 'account_holder',
        fields: ['id', 'provider_id', 'data'],
        filters: {
          id: accountHolderData.id,
        },
      },
      {
        throwIfKeyNotFound: false,
      },
    );

    if (createdAccountHolders && createdAccountHolders.length > 0) {
      const created = createdAccountHolders[0] as {
        id: string;
        provider_id: string;
        data: {
          id?: string;
        };
      };

      return new StepResponse({
        id: created.id,
        provider_id: created.provider_id || input.provider_id,
        data: {
          id: created.data?.id || accountHolderData.id,
        },
      } as AccountHolderData);
    }

    return new StepResponse({
      id: accountHolderData.id,
      provider_id: input.provider_id,
      data: {
        id: accountHolderData.id,
      },
    } as AccountHolderData);
  },
);
