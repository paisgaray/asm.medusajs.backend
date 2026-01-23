import { ContainerRegistrationKeys } from '@medusajs/framework/utils';
import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk';

type BundleVariantEntry = {
  id: string;
  status?: string | null;
  deleted_at?: string | null;
};

type BundleProductEntry = {
  id?: string;
  variants?: BundleVariantEntry[];
};

type BundleItemEntry = {
  id: string;
  product?: BundleProductEntry | null;
};

export type BundleGraphEntry = {
  id: string;
  items?: BundleItemEntry[];
};

type FetchBundleGraphStepInput = {
  bundle_id: string;
};

export const fetchBundleGraphStep = createStep(
  'fetch-bundle-graph-step',
  async (input: FetchBundleGraphStepInput, { container }) => {
    const query = container.resolve(ContainerRegistrationKeys.QUERY);

    const bundleResult = (await query.graph({
      entity: 'bundle',
      fields: ['id', 'items.*', 'items.product.*', 'items.product.variants.*'],
      filters: {
        id: input.bundle_id,
      },
    })) as { data?: BundleGraphEntry[] };

    const bundle = bundleResult.data?.[0];

    return new StepResponse(bundle);
  },
);
