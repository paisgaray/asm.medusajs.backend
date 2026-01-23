import { MedusaError, ContainerRegistrationKeys } from '@medusajs/framework/utils';
import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk';

import { BundleGraphEntry } from './fetch-bundle-graph-step';

type BundleItemOverride = {
  item_id: string;
  variant_id: string;
};

type PrepareBundleItemsStepInput = {
  bundle: BundleGraphEntry | undefined;
  overrides?: BundleItemOverride[];
};

type PreparedBundleItemsStepOutput = {
  bundle_id: string;
  items: BundleItemOverride[];
};

export const prepareBundleItemsStep = createStep(
  'prepare-bundle-items-step',
  async (input: PrepareBundleItemsStepInput, { container }) => {
    const logger = container.resolve(ContainerRegistrationKeys.LOGGER) as { warn?: (message: string) => void };

    if (!input.bundle) {
      throw new MedusaError(MedusaError.Types.NOT_FOUND, 'Bundle does not exist');
    }

    if (!input.bundle.items || input.bundle.items.length === 0) {
      logger?.warn?.(`Bundle ${input.bundle.id} has no items.`);
      throw new MedusaError(MedusaError.Types.INVALID_DATA, 'Bundle has no items');
    }

    const bundleItemsMap = new Map((input.bundle.items ?? []).map((bundleItem) => [bundleItem.id, bundleItem]));

    let preparedItems = input.overrides;

    if (!preparedItems || preparedItems.length === 0) {
      preparedItems = (input.bundle.items ?? []).map((bundleItem) => {
        const product = bundleItem.product;
        const variants = product?.variants ?? [];

        if (!product || variants.length === 0) {
          const productId = product?.id ?? 'unknown';
          throw new MedusaError(
            MedusaError.Types.INVALID_DATA,
            `Product ${productId} has no variants for bundle item ${bundleItem.id}`,
          );
        }

        const firstPublished = variants.find((variant) => variant?.status === 'published' && !variant?.deleted_at);

        const fallback = variants.find((variant) => !variant?.deleted_at) || variants[0];

        if (!firstPublished && !fallback) {
          throw new MedusaError(
            MedusaError.Types.INVALID_DATA,
            `Product ${product.id} has no active variants for bundle item ${bundleItem.id}`,
          );
        }

        const selectedVariant = firstPublished ?? fallback;

        if (!selectedVariant) {
          throw new MedusaError(
            MedusaError.Types.INVALID_DATA,
            `No valid variant found for bundle item ${bundleItem.id}`,
          );
        }

        return {
          item_id: bundleItem.id,
          variant_id: selectedVariant.id,
        };
      });
    } else {
      for (const override of preparedItems) {
        const sourceItem = bundleItemsMap.get(override.item_id);
        if (!sourceItem) {
          throw new MedusaError(
            MedusaError.Types.INVALID_DATA,
            `Bundle item ${override.item_id} is not part of bundle ${input.bundle.id}`,
          );
        }

        const product = sourceItem.product;
        const variants = product?.variants ?? [];

        if (!product || variants.length === 0) {
          const productId = product?.id ?? 'unknown';
          throw new MedusaError(
            MedusaError.Types.INVALID_DATA,
            `Product ${productId} has no variants for bundle item ${override.item_id}`,
          );
        }

        const variantMatch = variants.find((variant) => variant.id === override.variant_id);
        if (!variantMatch) {
          logger?.warn?.(
            `Variant override ${override.variant_id} is invalid for bundle item ${override.item_id} in bundle ${input.bundle.id}.`,
          );
          throw new MedusaError(
            MedusaError.Types.INVALID_DATA,
            `Variant ${override.variant_id} does not belong to bundle item ${override.item_id}`,
          );
        }
      }
    }

    return new StepResponse<PreparedBundleItemsStepOutput>({
      bundle_id: input.bundle.id,
      items: preparedItems,
    });
  },
);
