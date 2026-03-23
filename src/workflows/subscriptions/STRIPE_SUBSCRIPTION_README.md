# Stripe Subscription Integration

This document describes the current Stripe payment provider and subscription system implementation for bundle products.

## Overview

Customers subscribe to bundle products (fruit/vegetable baskets) with recurring payments via Stripe. Subscriptions are created automatically during checkout when order items carry an `is_subscription` metadata flag. The system supports **weekly**, **biweekly**, and **monthly** frequencies, delivery scheduling (date + period), a shipping address per subscription, and customization of individual bundle items via overrides.

The design is payment-provider agnostic (only Stripe is implemented).

## Architecture

### Modules

#### 1. Subscription Module (`src/modules/subscriptions/`)

Module key: `subscriptions` (exported as `SUBSCRIPTION_MODULE`).

**Models:**

- **`Subscription`** (`models/subscription.ts`)
  - `id` (PK)
  - `provider` — payment provider (`"stripe"`)
  - `provider_subscription_id` — Stripe subscription ID
  - `provider_customer_id` — Stripe customer ID
  - `status` — `active | paused | cancelled | past_due | incomplete` (default `active`)
  - `subscription_price` (number)
  - `currency` (text, default `eur`)
  - `frequency` — enum `weekly | biweekly | monthly` (default `monthly`)
  - `delivery_date` (datetime, nullable) — scheduled delivery date
  - `period` — enum `morning | afternoon | evening` (nullable)
  - `current_period_start` (datetime, nullable)
  - `next_billing_date` (datetime, nullable)
  - `provider_payment_method_id` (text, nullable)
  - `payment_last4` (text, nullable)
  - `payment_brand` (text, nullable)
  - `payment_exp_month` (number, nullable)
  - `payment_exp_year` (number, nullable)
  - `metadata` (jsonb, nullable)
  - `address` — belongsTo `SubscriptionAddress`

- **`SubscriptionAddress`** (`models/subscriptionAddress.ts`)
  - `id` (PK)
  - `first_name`, `last_name`, `address_1`, `address_2`, `city`, `country_code`, `postal_code`
  - `metadata` (jsonb, nullable)
  - `subscription` — hasMany `Subscription`

> **Note:** The old `SubscriptionItem` / `SubscriptionBundle` tables were renamed to `custom_item` / `custom_bundle` and moved to the **Bundled Product Module**. The link between subscriptions and bundles/items is now managed via Medusa link tables.

**Service** (`service.ts`) extends `MedusaService` and exposes:
- `enrichSubscriptionsWithProducts(query, subscriptions)` — cross-module product resolution for custom_items inside subscriptions (bundles and standalone).
- `getProductWithPrice(query, productId, variantId, currency)` — fetch product variant price for a given currency.
- `SUBSCRIPTION_FIELDS` — constant with all queryable fields for subscription list/detail endpoints.

**Types** (`types.ts`):
```typescript
enum SubscriptionStatus { ACTIVE, PAUSED, CANCELLED, PAST_DUE, INCOMPLETE }
enum SubscriptionProvider { STRIPE }
enum SubscriptionFrequency { WEEKLY, BIWEEKLY, MONTHLY }
enum SubscriptionPeriod { MORNING, AFTERNOON, EVENING }
```

#### 2. Bundle Product Module (`src/modules/bundled-product/`)

Module key: `bundledProduct` (exported as `BUNDLED_PRODUCT_MODULE`).

**Subscription-relevant models:**

- **`Bundle`** — `subscription_price` (bigNumber, nullable), `currency` (text, default `eur`), `items` hasMany `BundleItem`.
- **`CustomBundle`** — instance of a bundle tied to a subscription. Has `bundle_id`, `metadata`, `items` (hasMany `CustomItem`), `itemsOverride` (hasMany `CustomItemOverride`).
- **`CustomItem`** — `type` enum (`single | bundle`), `product_snapshot` (json), belongs to `CustomBundle`. Linked to `Product` via link table.
- **`CustomItemOverride`** — temporary replacement for a `CustomItem` until `expire_date`. Linked to a replacement `Product` via link table.

### Links (`src/links/`)

| Link file | From | To | Notes |
|---|---|---|---|
| `subscription-customer.ts` | `subscription` (list) | `customer` | Many subscriptions per customer |
| `subscription-custom-bundle.ts` | `subscription` | `customBundle` (list) | Subscription → custom bundles |
| `subscription-custom-item.ts` | `subscription` | `customItem` (list) | Subscription → standalone custom items |
| `subscription-order.ts` | `subscription` | `order` | 1-to-1 link to originating order |
| `subscription-item-variant.ts` | `customItem` (list) | `productVariant` | Custom item → product variant |

### Workflows (`src/workflows/subscriptions/`)

#### `create-subscription` (main workflow)
Creates a full subscription with Stripe integration:
1. `validateSubscriptionProductStep` — queries product with linked bundle; resolves price from variant's first price.
2. `getOrCreateStripeCustomerStep` — looks up `stripe_customer_id` in customer metadata; creates Stripe customer if missing; stores ID in customer metadata. Skipped if `stripe_customer_id` is already provided.
3. `attachPaymentMethodStep` — attaches payment method to Stripe customer, sets as default. Returns card details (last4, brand, exp).
4. `getsertStripeProductStep` — searches Stripe products by `medusa_product_id` metadata; creates if not found.
5. `createStripeSubscriptionStep` — creates the Stripe subscription with `price_data` (recurring interval based on frequency). Supports `skip_first_charge` via `backdate_start_date`. Has compensation handler that cancels the Stripe subscription on rollback.
6. `createSubscriptionAddressStep` — copies order shipping address into `subscription_address` table.
7. `createSubscriptionRecordStep` — persists subscription record.
8. `createSubscriptionCustomerLinkStep` — links subscription to customer via Medusa remote link.
9. `createSubscriptionBundleLinkStep` — links subscription to custom bundle via remote link.

**Input:**
```typescript
{
  customer_id: string;
  bundle_product_id: string;
  stripe_customer_id?: string;     // Skip customer lookup if provided
  skip_first_charge?: boolean;     // Checkout already charged first period
  payment_method_id?: string;      // Attach to customer
  frequency?: string;              // weekly | biweekly | monthly
  order?: OrderDTO;                // For address & delivery metadata
  metadata: Record<string, unknown>; // Must include custom_bundle_id
}
```

#### `checkout-subscription` (checkout integration)
Triggered from order-placed subscriber. Orchestrates subscription detection and creation:
1. `fetchOrderForSubscriptionStep` — fetches order with items, payment collections, addresses.
2. `detectSubscriptionItemsStep` — identifies subscription items via `item.metadata.is_subscription` flag; separates one-time items.
3. `getPaymentMethodFromOrderStep` — extracts Stripe payment method and customer ID from payment session data / payment intent.
4. `createCheckoutSubscriptionsStep` — iterates detected subscription items, calls `createSubscriptionWorkflow` for each with `skip_first_charge: true`.
5. `updateOrderMetadataStep` — adds `subscription_ids` and `is_subscription_order` to order metadata.

#### `cancel-subscription`
1. `cancelStripeSubscriptionStep` — calls `stripe.subscriptions.cancel()`.
2. `updateSubscriptionStatusStep` — sets status to `cancelled`.

#### `pause-subscription`
1. `pauseStripeSubscriptionStep` — calls `stripe.subscriptions.update()` with `pause_collection: { behavior: 'void' }`. Compensation resumes the subscription.
2. `updateSubscriptionStatusStep` — sets status to `paused`.

#### `resume-subscription`
1. `resumeStripeSubscriptionStep` — calls `stripe.subscriptions.update()` with `pause_collection: null`. Compensation re-pauses.
2. `updateSubscriptionStatusStep` — sets status to `active`.

#### `change-address-subscription`
1. `updateSubscriptionProgramationStep` — updates `delivery_date` and `period` on subscription.
2. `updateSubscriptionAddressStep` — updates the linked `subscription_address` record.

#### `change-frequency-subscription`
1. `updateSubscriptionFrequencyStep` — updates `frequency` on subscription record.
   > **TODO:** Add Stripe frequency update logic (currently local-only).

#### `add-item-to-subscription`
Adds one or more standalone custom items to an existing subscription and updates the Stripe subscription price to reflect the new total.
1. `fetchSubscriptionPricingStep` — for each product in `items`, queries the product via `query.graph` (including `variants.options.*` and `variants.options.option.*`); resolves the subscription-variant price via `resolveSubscriptionPrice`; accumulates the new total price.
2. `transform` — merges resolved `item_prices` back onto the input items array.
3. `createStandaloneCustomItemsStep` — creates `custom_item` records in the Bundled Product Module (with `quantity` and `item_price` in cents).
4. `createRemoteLinkStep` — for each created item, creates two links: `custom_item ↔ product` and `subscription ↔ custom_item`.
5. `updateProviderSubscriptionPriceStep` — updates the Stripe subscription price.
6. `updateSubscriptionPriceRecordStep` — persists the new `subscription_price` in the DB.

**Input:**
```typescript
{
  subscription_id: string;
  items: { product_id: string; quantity: number }[];
}
```

#### `update-subscription-item-quantity`
Changes the quantity of an existing standalone custom item and adjusts the subscription price by the signed delta.
1. `updateItemQuantityStep` — reads the item's current quantity, updates it, returns `{ previous_quantity, new_quantity }`. Compensation restores the previous value.
2. `transform` — computes `quantity_delta = new_quantity - previous_quantity`.
3. `fetchItemPriceDeltaStep` — calculates price change: `delta × item.item_price`. Returns a `SubscriptionPricingResult`.
4. `updateProviderSubscriptionPriceStep` — applies the new price to Stripe.
5. `updateSubscriptionPriceRecordStep` — persists the updated `subscription_price`.

**Input:**
```typescript
{
  subscription_id: string;
  item_id: string;
  quantity: number;  // new absolute quantity (≥ 1)
}
```

#### `remove-subscription-item`
Fully removes a standalone custom item from a subscription: dismisses all links, deletes the entity, and reduces the Stripe subscription price by the item's full value (`quantity × item_price`).
1. `fetchItemPriceDeltaStep` (with `remove_item: true`) — computes `delta = -(item.quantity)`. Returns pricing result.
2. `useQueryGraphStep` — fetches the item's linked `product.id` for link dismissal.
3. `dismissRemoteLinkStep` (×2) — removes `subscription ↔ custom_item` and `custom_item ↔ product` remote links.
4. `deleteCustomItemStep` — deletes the `custom_item` record. Compensation re-creates from a snapshot.
5. `updateProviderSubscriptionPriceStep` — applies reduced price to Stripe.
6. `updateSubscriptionPriceRecordStep` — persists the updated `subscription_price`.

**Input:**
```typescript
{
  subscription_id: string;
  item_id: string;
}
```

#### `skip-subscription`
Skips the next billing cycle by voiding the upcoming invoice and advancing `next_billing_date` by one interval. Uses the **provider adapter pattern** to delegate to the correct payment provider.
1. `validateAndComputeSkipStep` — validates subscription is `active` and has `next_billing_date`; computes new date based on `frequency` (`weekly` → +7d, `biweekly` → +14d, `monthly` → +1 month). Returns `provider`, `provider_subscription_id`, `new_next_billing_date`.
2. `skipProviderSubscriptionStep` — resolves the provider adapter via `getProviderAdapter(provider)` and calls `adapter.skipNextPayment()`. Compensation calls `adapter.rollbackSkip()`.
3. `updateSubscriptionNextBillingStep` — persists `next_billing_date` in DB. Compensation restores previous value.

**Stripe implementation:** Uses `pause_collection` with `behavior: 'void'` and `resumes_at` set to the new billing date ([Stripe docs](https://docs.stripe.com/billing/subscriptions/pause-payment)). The next invoice is voided, subscription stays `active`, and collection auto-resumes.

### Shared Steps (`src/workflows/subscriptions/steps/`)

#### `fetch-subscription-pricing`
Read-only step used by `add-item-to-subscription`. For each item in the input list:
- Queries the product via `query.graph` (with `variants.options.*` and `variants.options.option.*`).
- Calls `resolveSubscriptionPrice(variants, currency)` to resolve the correct variant price in cents.
- Accumulates a total added price.

Returns a `SubscriptionPricingResult` with `previous_price`, `new_price`, and `item_prices[]` (all in cents).

#### `fetch-item-price-delta`
Read-only step used by `update-subscription-item-quantity` and `remove-subscription-item`. Computes the signed price change when a quantity changes:
- When `remove_item: true` — delta is `-(item.quantity)`.
- When `quantity_delta` provided — delta is `quantity_delta`.
- Price change = `delta × item.item_price` (both in cents).

Returns a `SubscriptionPricingResult` ready for `updateProviderSubscriptionPriceStep`.

#### `update-provider-subscription-price`
Provider-agnostic step that delegates to the correct adapter to update the recurring price on the payment provider (Stripe). Uses `getProviderAdapter(provider)`. Compensation rolls back to `previous_price`.

#### `update-subscription-price-record`
Persists the new `subscription_price` (in cents) on the subscription record in the DB. Compensation restores the previous value.

### Utility (`src/utils/resolve-subscription-price.ts`)

Shared utility for subscription price resolution. Exported functions:

| Function | Description |
|---|---|
| `formatPrice(amountInCents)` | Divides cents by 100 for API responses (e.g. 2800 → 28). Used in `enrichSubscriptionsWithProducts`. |
| `findSubscriptionVariant(variants)` | Returns the variant whose option has `title === 'as'` and `value === 'subscription'`, or the first variant as fallback. |
| `resolveSubscriptionPrice(variants, currencyCode?)` | Calls `findSubscriptionVariant` then picks the best matching price and returns its value **in cents** (`Math.round(amount × 100)`). |

> **Price convention:** Medusa's `price.amount` and `calculated_price.calculated_amount` are in **major currency units** (e.g. `28` = €28). All storage (`subscription_price`, `item_price`) is in **integer cents** (multiply by 100 on write). API responses expose `calculated_price` via `formatPrice()` (divide by 100 on read).

### Subscribers

- **`order-placed.ts`** — listens to `order.placed` event; runs `checkoutSubscriptionWorkflow`. Catches errors to avoid failing the order.

### API Routes

#### Store API (`/store/customers/me/subscriptions`)
All store routes require customer authentication via `authenticate('customer', ['bearer', 'session'])`.

| Method | Path | Description |
|---|---|---|
| GET | `/store/customers/me/subscriptions` | List authenticated customer's subscriptions with enriched products and custom bundles |
| GET | `/store/customers/me/subscriptions/:id` | Get subscription detail with custom bundle items and overrides |
| POST | `/store/customers/me/subscriptions/:id/pause` | Pause subscription (verifies ownership) |
| POST | `/store/customers/me/subscriptions/:id/resume` | Resume subscription (verifies ownership) |
| POST | `/store/customers/me/subscriptions/:id/cancel` | Cancel subscription (verifies ownership) |
| POST | `/store/customers/me/subscriptions/:id/skip` | Skip next billing cycle (verifies ownership) |
| POST | `/store/customers/me/subscriptions/:id/address` | Update delivery address + schedule (validated with zod) |
| POST | `/store/customers/me/subscriptions/:id/frequency` | Change frequency: `weekly \| biweekly \| monthly` (validated with zod) |
| POST | `/store/customers/me/subscriptions/:id/item` | Add standalone item(s) to subscription — resolves subscription-variant price per product (validated with zod) |
| PATCH | `/store/customers/me/subscriptions/:id/item/:item_id` | Update item quantity — adjusts Stripe price by signed delta (validated with zod) |
| DELETE | `/store/customers/me/subscriptions/:id/item/:item_id` | Remove item from subscription — dismisses links, deletes entity, reduces price |
| POST | `/store/customers/me/subscriptions/:id/bundle/:bundleId/item/:bundleItemId` | Update a custom bundle item — swap product via override (validated with zod) |

**Add item body:**
```json
{
  "items": [
    { "product_id": "prod_xxx", "quantity": 1 }
  ]
}
```

**Update item quantity body:**
```json
{ "quantity": 2 }
```

**Address update body:**
```json
{
  "delivery_date": "2026-04-01",
  "period": "morning",
  "first_name": "...", "last_name": "...",
  "address_1": "...", "address_2": "...",
  "city": "...", "country_code": "...", "postal_code": "..."
}
```

**Frequency update body:**
```json
{ "frequency": "biweekly" }
```

**Custom item update body:**
```json
{ "product_id": "prod_xxx", "applyToAllShipments": false }
```

#### Admin API (`/admin/subscriptions`)

| Method | Path | Description |
|---|---|---|
| GET | `/admin/subscriptions` | List subscriptions with filters (`customer_id`, `status`, `limit`, `offset`) |
| POST | `/admin/subscriptions` | Create subscription (`customer_id`, `bundle_product_id`, `metadata`) |
| GET | `/admin/subscriptions/:id` | Get subscription detail |
| POST | `/admin/subscriptions/:id` | Update subscription `status` and/or `metadata` |
| POST | `/admin/subscriptions/:id/cancel` | Cancel subscription via workflow |

### Webhooks

- **`/webhooks/payment-failed`** — receives Stripe `payment_intent.payment_failed` and PayPal `PAYMENT.CAPTURE.DENIED` events; emits `payment.failed` Medusa event for email notifications.

## Database Schema (current)

### subscription
```sql
id               text PK
provider         text NOT NULL
provider_subscription_id  text NOT NULL
provider_customer_id      text NOT NULL
status           text NOT NULL DEFAULT 'active'
subscription_price  integer NOT NULL
currency         text NOT NULL DEFAULT 'eur'
frequency        text NOT NULL DEFAULT 'monthly'  CHECK (weekly|biweekly|monthly)
delivery_date    timestamptz NULL
period           text NULL  CHECK (morning|afternoon|evening)
current_period_start      timestamptz NULL
next_billing_date         timestamptz NULL
provider_payment_method_id  text NULL
payment_last4    text NULL
payment_brand    text NULL
payment_exp_month  integer NULL
payment_exp_year   integer NULL
address_id       text NULL FK -> subscription_address(id)
metadata         jsonb NULL
created_at       timestamptz NOT NULL DEFAULT now()
updated_at       timestamptz NOT NULL DEFAULT now()
deleted_at       timestamptz NULL
```

### subscription_address
```sql
id             text PK
first_name     text NOT NULL
last_name      text NOT NULL
address_1      text NOT NULL
address_2      text NOT NULL
city           text NOT NULL
country_code   text NOT NULL
postal_code    text NOT NULL
metadata       jsonb NULL
created_at     timestamptz NOT NULL DEFAULT now()
updated_at     timestamptz NOT NULL DEFAULT now()
deleted_at     timestamptz NULL
```

### custom_bundle (bundled-product module)
```sql
id          text PK
bundle_id   text NOT NULL
metadata    jsonb NULL
created_at, updated_at, deleted_at
```

### custom_item (bundled-product module — renamed from subscription_item)
```sql
id                text PK
type              text NOT NULL DEFAULT 'single'  CHECK (single|bundle)
product_snapshot  jsonb NOT NULL
quantity          integer NOT NULL DEFAULT 1
item_price        integer NOT NULL DEFAULT 0      -- stored in cents
custom_bundle_id  text NULL FK -> custom_bundle(id)
created_at, updated_at, deleted_at
```

### custom_item_override (bundled-product module)
```sql
id                text PK
expire_date       timestamptz NOT NULL
custom_bundle_id  text NULL FK -> custom_bundle(id)
custom_item_id    text FK -> custom_item(id)
created_at, updated_at, deleted_at
-- linked to product via link table
```

### Link tables (auto-generated by Medusa)
- `subscription_customer` — `subscription_id`, `customer_id`
- `subscription_custom_bundle` — `subscription_id`, `custom_bundle_id`
- `subscription_custom_item` — `subscription_id`, `custom_item_id` (isList — one subscription can have many standalone items)
- `subscription_order` — `subscription_id`, `order_id`
- `custom_item_product` — `custom_item_id`, `product_id` (linked to core `Product`)
- `custom_item_product_variant` — `custom_item_id`, `product_variant_id`

## Payment Flow

### Checkout-based Subscription Creation (current flow)

1. Customer adds a subscription bundle product to cart (line item has `metadata.is_subscription = true`, `metadata.frequency`, `metadata.custom_bundle_id`, etc.).
2. Customer completes normal checkout, including Stripe payment.
3. On `order.placed` event, `orderPlacedHandler` subscriber triggers `checkoutSubscriptionWorkflow`.
4. Workflow detects subscription items by `metadata.is_subscription`.
5. Extracts Stripe payment method and customer from the order's payment session.
6. For each subscription item, calls `createSubscriptionWorkflow` with `skip_first_charge: true` (checkout already charged for the first period).
7. Stripe subscription is created with `backdate_start_date` so the next billing naturally occurs one interval from now.
8. Subscription record, address, and links (customer, custom bundle, order) are persisted.
9. Order metadata is updated with `subscription_ids` and `is_subscription_order: true`.

### Recurring Payments

Stripe automatically charges the customer on the configured interval:
- Stripe creates invoice → attempts payment → sends webhook events.

### Subscription Management

Customers can manage subscriptions via the store API:
- **Pause**: Stripe `pause_collection` with `behavior: 'void'`
- **Resume**: Clears `pause_collection`
- **Cancel**: Immediate Stripe cancellation
- **Change address/schedule**: Updates local `subscription_address` and delivery date/period
- **Change frequency**: Updates local record (TODO: sync to Stripe)
- **Skip next payment**: Voids upcoming invoice via provider adapter; advances `next_billing_date` by one interval
- **Swap bundle items**: Creates `CustomItemOverride` with `expire_date = next_billing_date`

## Setup Instructions

### 1. Install Dependencies
```bash
npm install stripe --save --legacy-peer-deps
```

### 2. Configure Environment Variables
```bash
STRIPE_API_KEY=sk_test_your_stripe_secret_key
```

### 3. Run Migrations
```bash
npm run migrations
```

### 4. Enable Stripe in Admin
Settings → Regions → Add "Stripe" as payment provider.

## Error Handling & Compensation

All workflow steps have compensation handlers where applicable:
- `createStripeSubscriptionStep` → cancels Stripe subscription on rollback
- `getOrCreateStripeCustomerStep` → restores original customer metadata
- `getsertStripeProductStep` → deletes Stripe product if newly created
- `pauseStripeSubscriptionStep` → resumes subscription on rollback
- `resumeStripeSubscriptionStep` → re-pauses on rollback
- `skipProviderSubscriptionStep` → calls `adapter.rollbackSkip()` (unsets `pause_collection` for Stripe)
- `updateSubscriptionNextBillingStep` → restores previous `next_billing_date`
- `createSubscriptionRecordStep` → deletes subscription record
- `createSubscriptionAddressStep` → deletes address record
- `createSubscriptionCustomerLinkStep` → dismisses link
- `createSubscriptionBundleLinkStep` → dismisses link

The `orderPlacedHandler` subscriber catches errors so subscription failures don't block order completion.

## Provider Agnostic Design

```typescript
export enum SubscriptionProvider {
  STRIPE = 'stripe',
  // PAYPAL = 'paypal', // Future
}
```

### Provider Adapter Pattern (`src/modules/subscriptions/adapters/`)

The `skip-subscription` workflow uses an adapter pattern for provider-agnostic payment operations:

```typescript
// Interface — src/modules/subscriptions/adapters/provider-adapter.ts
export interface SubscriptionProviderAdapter {
  skipNextPayment(providerSubscriptionId: string, resumesAt: Date): Promise<void>;
  rollbackSkip(providerSubscriptionId: string): Promise<void>;
}
```

**Implementations:**
- `StripeSubscriptionAdapter` (`adapters/stripe-adapter.ts`) — uses `pause_collection` with `behavior: 'void'` + `resumes_at`

**Registry** (`adapters/index.ts`):
```typescript
getProviderAdapter(provider: string): SubscriptionProviderAdapter
```
Looks up the provider in a registry map and returns the adapter instance. Throws if no adapter is registered.

**Adding a new provider:**
1. Create `adapters/new-provider-adapter.ts` implementing `SubscriptionProviderAdapter`
2. Register in `adapters/index.ts`: `newProvider: () => new NewProviderAdapter()`
3. No workflow or step changes needed.

Other workflows (pause, resume, cancel) still call Stripe-specific steps directly. These can be migrated to the adapter pattern as needed.

## Key Files Reference

| Area | Path |
|---|---|
| Module index | `src/modules/subscriptions/index.ts` |
| Module service | `src/modules/subscriptions/service.ts` |
| Module types | `src/modules/subscriptions/types.ts` |
| Subscription model | `src/modules/subscriptions/models/subscription.ts` |
| Address model | `src/modules/subscriptions/models/subscriptionAddress.ts` |
| Migrations | `src/modules/subscriptions/migrations/` |
| Links | `src/links/subscription-*.ts` |
| Workflows | `src/workflows/subscriptions/` |
| Workflow steps | `src/workflows/subscriptions/steps/` |
| Store API routes | `src/api/store/customers/me/subscriptions/` |
| Admin API routes | `src/api/admin/subscriptions/` |
| Middleware config | `src/api/middlewares.ts` |
| Order-placed subscriber | `src/subscribers/order-placed.ts` |
| Payment failed webhook | `src/api/webhooks/payment-failed/route.ts` |
| Provider adapters | `src/modules/subscriptions/adapters/` |
| Bundle model | `src/modules/bundled-product/models/bundle.ts` |
| CustomBundle model | `src/modules/bundled-product/models/custom-bundle.ts` |
| CustomItem model | `src/modules/bundled-product/models/custom-item.ts` |
| CustomItemOverride model | `src/modules/bundled-product/models/custom-item-override.ts` |

## Testing

### Stripe Test Cards
- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`
- Requires Authentication: `4000 0025 0000 3155`

### Manual Testing Checklist
- [ ] Place order with subscription bundle item → subscription auto-created
- [ ] Verify subscription saved in DB with correct frequency, address, payment info
- [ ] Verify custom bundle and items snapshot created
- [ ] Verify order metadata updated with subscription_ids
- [ ] Pause subscription → Stripe paused, local status `paused`
- [ ] Resume subscription → Stripe resumed, local status `active`
- [ ] Cancel subscription → Stripe cancelled, local status `cancelled`
- [ ] Skip next payment → Stripe `pause_collection` set with `resumes_at`, DB `next_billing_date` advanced
- [ ] Change address and delivery schedule
- [ ] Change frequency
- [ ] Swap custom bundle item (override)
- [ ] Test unauthorized access (different customer)
- [ ] Test with invalid bundle ID

## Known TODOs
- [ ] Sync frequency changes to Stripe (currently local-only — see `update-subscription-frequency.ts`)
- [ ] Webhook handlers for `invoice.payment_succeeded` (auto-create recurring orders), `invoice.payment_failed`, `customer.subscription.deleted`, `customer.subscription.updated`
- [ ] Subscription modifications (mid-cycle bundle content changes with proration)
- [ ] Multiple payment methods (let users change payment method)
- [ ] Trial periods
- [ ] Dunning management for failed payment retries
- [ ] Analytics (MRR, churn, LTV)
