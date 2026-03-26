import { ContainerRegistrationKeys, Modules } from '@medusajs/framework/utils';
import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk';

export type GetCustomerAccountHoldersStepInput = {
  customer_id: string;
};

export type AccountHolderData = {
  id: string;
  provider_id: string;
  data: {
    id: string;
  };
};

export const getCustomerAccountHoldersStep = createStep(
  'get-customer-account-holders-step',
  async (input: GetCustomerAccountHoldersStepInput, { container }) => {
    const query = container.resolve(ContainerRegistrationKeys.QUERY);
    const link = container.resolve(ContainerRegistrationKeys.LINK);

    const { data: customerData } = await query.graph(
      {
        entity: 'customer',
        fields: ['id'],
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

    const allLinks = await link.list({
      [Modules.CUSTOMER]: { customer_id: input.customer_id },
    });

    if (!allLinks || allLinks.length === 0) {
      return new StepResponse([]);
    }

    const accountHolderIds = allLinks
      .map((linkEntry) => linkEntry[Modules.PAYMENT]?.account_holder_id)
      .filter((id): id is string => !!id);

    if (accountHolderIds.length === 0) {
      return new StepResponse([]);
    }

    const { data: accountHoldersData } = await query.graph(
      {
        entity: 'account_holder',
        fields: ['id', 'provider_id', 'data'],
        filters: {
          id: accountHolderIds,
        },
      },
      {
        throwIfKeyNotFound: false,
      },
    );

    if (!accountHoldersData || accountHoldersData.length === 0) {
      return new StepResponse([]);
    }

    const accountHolders: AccountHolderData[] = accountHoldersData
      .filter((ah: { provider_id?: string; data?: { id?: string } }) => ah.provider_id && ah.data?.id)
      .map((ah: { id: string; provider_id: string; data: { id?: string } }) => ({
        id: ah.id,
        provider_id: ah.provider_id,
        data: {
          id: ah.data.id!,
        },
      }));

    return new StepResponse(accountHolders);
  },
);
