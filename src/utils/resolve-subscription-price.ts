type VariantPrice = { amount?: number; currency_code?: string };

/** Converts a stored cent amount to a currency unit value (e.g. 2800 → 28.00). */
export function formatPrice(amountInCents: number): number {
  return amountInCents / 100;
}
type VariantOption = { value?: string; option?: { title?: string } };
type Variant = {
  prices?: VariantPrice[];
  options?: VariantOption[];
};

function pickPrice(prices: VariantPrice[], currencyCode?: string): number {
  if (!prices?.length) return 0;
  if (currencyCode) {
    const match = prices.find((p) => p.currency_code === currencyCode);
    if (match?.amount != null) return Math.round(match.amount * 100);
  }
  return Math.round((prices[0]?.amount ?? 0) * 100);
}

function isSubscriptionVariant(variant: Variant): boolean {
  return (variant.options ?? []).some((o) => o.option?.title === 'as' && o.value === 'subscription');
}

/**
 * Returns the variant with option `as: 'subscription'`, or the first variant as fallback.
 */
export function findSubscriptionVariant<T extends Variant>(variants: T[]): T | undefined {
  if (!variants?.length) return undefined;
  return variants.find(isSubscriptionVariant) ?? variants[0];
}

/**
 * Resolves the best price for a subscription from a list of variants.
 * Prefers the variant with option `as: 'subscription'`, falls back to
 * the first variant. Within a variant, prefers currency match.
 */
export function resolveSubscriptionPrice(variants: Variant[], currencyCode?: string): number {
  if (!variants?.length) return 0;

  const subscriptionVariant = variants.find(isSubscriptionVariant);
  if (subscriptionVariant?.prices?.length) {
    return pickPrice(subscriptionVariant.prices, currencyCode);
  }

  return pickPrice(variants[0]?.prices ?? [], currencyCode);
}
