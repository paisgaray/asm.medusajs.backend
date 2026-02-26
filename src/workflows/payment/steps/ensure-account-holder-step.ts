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
        fields: ['id', 'email'],
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

    const customer = customerData[0] as { id: string; email: string };

    const allLinks = await link.list({
      [Modules.CUSTOMER]: { customer_id: input.customer_id },
    });

    if (allLinks && allLinks.length > 0) {
      const accountHolderIds = allLinks
        .map((linkEntry) => linkEntry[Modules.PAYMENT]?.account_holder_id)
        .filter((id): id is string => !!id);

      if (accountHolderIds.length > 0) {
        const { data: accountHoldersData } = await query.graph(
          {
            entity: 'account_holder',
            fields: ['id', 'provider_id', 'data'],
            filters: {
              id: accountHolderIds,
              provider_id: input.provider_id,
            },
          },
          {
            throwIfKeyNotFound: false,
          },
        );

        if (accountHoldersData && accountHoldersData.length > 0) {
          const existing = accountHoldersData[0] as {
            id: string;
            provider_id: string;
            data: {
              id?: string;
            };
          };

          if (existing?.data?.id) {
            return new StepResponse({
              id: existing.id,
              provider_id: existing.provider_id,
              data: {
                id: existing.data.id,
              },
            } as AccountHolderData);
          }
        }
      }
    }

    const paymentModuleService = container.resolve('payment');

    if (!paymentModuleService?.createAccountHolder) {
      throw new Error('Payment provider does not support creating account holders');
    }

    try {
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
    } catch (createError) {
      const errorMessage = createError instanceof Error ? createError.message : 'Unknown error';
      throw new Error(`Account holder creation failed: ${errorMessage}`);
    }
  },
);
