import { ContainerRegistrationKeys } from '@medusajs/framework/utils';
import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk';

export type GetCustomerAccountHoldersStepInput = {
  customer_id: string;
  provider_id?: string;
};

export type AccountHolderData = {
  id: string;
  provider_id: string;
  data: {
    id: string;
    [key: string]: unknown;
  };
};

export const getCustomerAccountHoldersStep = createStep(
  'get-customer-account-holders-step',
  async (input: GetCustomerAccountHoldersStepInput, { container }) => {
    const query = container.resolve(ContainerRegistrationKeys.QUERY);

    const { data: customerData } = await query.graph(
      {
        entity: 'customer',
        fields: ['id', 'account_holders.id', 'account_holders.provider_id', 'account_holders.data'],
        filters: {
          id: input.customer_id,
        },
      },
      {
        throwIfKeyNotFound: false,
      },
    );

    if (!customerData || customerData.length === 0) {
      return new StepResponse([]);
    }

    const accountHoldersData =
      (
        customerData[0] as {
          account_holders?: Array<{ id: string; provider_id: string; data: Record<string, unknown> & { id?: string } }>;
        }
      ).account_holders ?? [];

    if (accountHoldersData.length === 0) {
      return new StepResponse([]);
    }

    const accountHolders: AccountHolderData[] = accountHoldersData
      .filter((ah) => ah && ah.provider_id && ah.data?.id)
      .filter((ah) => !input.provider_id || ah.provider_id === input.provider_id)
      .map((ah) => ({
        id: ah.id,
        provider_id: ah.provider_id,
        data: {
          ...(ah.data as Record<string, unknown>),
          id: ah.data.id as string,
        },
      }));

    return new StepResponse(accountHolders);
  },
);
