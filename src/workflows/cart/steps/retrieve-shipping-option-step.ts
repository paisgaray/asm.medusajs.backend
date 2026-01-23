import { ContainerRegistrationKeys } from '@medusajs/framework/utils';
import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk';

export type RetrieveShippingOptionStepInput = {
  option_id: string;
  currency_code: string;
};

export type ShippingOptionData = {
  id: string;
  name: string;
  price_type: string;
  provider_id: string;
  service_zone_id: string;
  shipping_profile_id: string;
  amount: number;
};

export const retrieveShippingOptionStep = createStep(
  'retrieve-shipping-option-step',
  async (input: RetrieveShippingOptionStepInput, { container }) => {
    const query = container.resolve(ContainerRegistrationKeys.QUERY);

    // Get shipping option details
    const { data: shippingOptions } = await query.graph({
      entity: 'shipping_option',
      fields: ['id', 'name', 'price_type', 'provider_id', 'service_zone_id', 'shipping_profile_id'],
      filters: { id: input.option_id },
    });

    if (!shippingOptions || shippingOptions.length === 0) {
      throw new Error(`Shipping option with id ${input.option_id} not found`);
    }

    const shippingOption = shippingOptions[0];

    // Get price for this shipping option
    const { data: priceSets } = await query.graph({
      entity: 'shipping_option_price_set',
      fields: ['price_set_id'],
      filters: { shipping_option_id: input.option_id },
    });

    let amount = 0;
    if (priceSets.length > 0) {
      const { data: prices } = await query.graph({
        entity: 'price',
        fields: ['amount', 'currency_code'],
        filters: {
          price_set_id: priceSets[0].price_set_id,
          currency_code: input.currency_code,
        },
      });

      if (prices.length > 0) {
        amount = prices[0].amount;
      }
    }

    const result: ShippingOptionData = {
      ...shippingOption,
      amount,
    };

    return new StepResponse(result);
  },
);
