# Stripe Subscription Integration

This document describes the Stripe payment provider and subscription system implementation for bundle products.

## Overview

This implementation allows customers to subscribe to bundle products (fruit/vegetable baskets) with monthly recurring payments via Stripe. The system is designed to be payment-provider agnostic, allowing for future integration of additional payment providers.

## Architecture

### Modules

#### 1. **Subscription Module** (`src/modules/subscriptions/`)
Custom module that manages subscription lifecycle and data.

**Models:**
- `Subscription`: Main subscription entity
  - `customer_id`: Links to Medusa customer
  - `bundle_product_id`: References the bundle product
  - `provider`: Payment provider (e.g., "stripe")
  - `provider_subscription_id`: Stripe subscription ID
  - `provider_customer_id`: Stripe customer ID
  - `status`: active, paused, cancelled, past_due, incomplete
  - `subscription_price`: Monthly price
  - `currency`: Currency code (default: usd)
  - `current_period_start`: Billing period start
  - `current_period_end`: Billing period end
  - `next_billing_date`: Next payment date

- `SubscriptionItem`: Snapshot of bundle items at subscription time
  - `product_id`: Original product reference
  - `variant_id`: Original variant reference
  - `quantity`: Item quantity
  - `product_snapshot`: JSON snapshot of product details

#### 2. **Bundle Product Module** (`src/modules/bundled-product/`)
Extended to support subscriptions.

**New Fields:**
- `subscription_price`: Monthly subscription price (nullable)
- `currency`: Currency for subscription (default: 'usd')

Products with the "subscription" tag and a subscription_price are eligible for subscriptions.

### Workflows

#### Create Subscription (`create-subscription`)
1. **Validate Product**: Ensures bundle has subscription_price
2. **Create Stripe Subscription**: Creates subscription in Stripe with optional one-time items
3. **Create Subscription Record**: Stores subscription in database
4. **Snapshot Bundle Items**: Captures current bundle composition

**Input:**
```typescript
{
  customer_id: string;
  bundle_product_id: string;
  one_time_items?: Array<{...}>; // Optional one-time products
}
```

**Output:**
```typescript
{
  subscription: Subscription;
  client_secret: string; // For payment confirmation
}
```

#### Pause Subscription (`pause-subscription`)
Pauses billing using Stripe's pause collection feature.

#### Resume Subscription (`resume-subscription`)
Resumes a paused subscription.

#### Cancel Subscription (`cancel-subscription`)
Immediately cancels a subscription.

### API Routes

#### Store API (`/store/subscriptions`)

**GET /store/subscriptions**
List customer's subscriptions (requires authentication)

**POST /store/subscriptions**
Create new subscription
```json
{
  "bundle_product_id": "bundle_123",
  "one_time_items": [] // Optional
}
```

**GET /store/subscriptions/:id**
Get subscription details

**POST /store/subscriptions/:id/pause**
Pause subscription

**POST /store/subscriptions/:id/resume**
Resume subscription

**POST /store/subscriptions/:id/cancel**
Cancel subscription

#### Admin API (`/admin/subscriptions`)

**GET /admin/subscriptions**
List all subscriptions with filters
- Query params: `customer_id`, `status`, `limit`, `offset`

**POST /admin/subscriptions**
Create subscription for a customer

**GET /admin/subscriptions/:id**
Get subscription details

**POST /admin/subscriptions/:id**
Update subscription metadata or status

**POST /admin/subscriptions/:id/cancel**
Cancel subscription

## Setup Instructions

### 1. Install Dependencies

```bash
npm install stripe --save --legacy-peer-deps
```

### 2. Configure Environment Variables

Add to `.env`:
```bash
STRIPE_API_KEY=sk_test_your_stripe_secret_key
```

### 3. Run Migrations

```bash
npm run migrations
```

This will:
- Add `subscription_price` and `currency` to bundle table
- Create `subscription` and `subscription_item` tables

### 4. Enable Stripe in Admin

1. Start Medusa: `npm run dev`
2. Go to Admin Dashboard
3. Navigate to Settings -> Regions
4. Edit your region
5. Add "Stripe" as a payment provider

### 5. Tag Products for Subscription

Products must have:
- Tag: "subscription"
- `subscription_price` field set in bundle metadata

## User Flow

### Frontend Integration

1. **Display Subscription Products**
```typescript
// Check if bundle has subscription_price
if (bundle.subscription_price && bundle.tags.includes('subscription')) {
  // Show subscription option
}
```

2. **Create Subscription**
```typescript
const response = await fetch('/store/subscriptions', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    bundle_product_id: 'bundle_123',
    one_time_items: [...] // Optional
  })
});

const { subscription, client_secret } = await response.json();
```

3. **Confirm Payment (Stripe Elements)**
```typescript
const stripe = Stripe('pk_test_...');
const { error } = await stripe.confirmPayment({
  clientSecret: client_secret,
  confirmParams: {
    return_url: 'https://yourstore.com/subscription-success',
  }
});
```

4. **Manage Subscription**
```typescript
// Pause
await fetch(`/store/subscriptions/${id}/pause`, { method: 'POST' });

// Resume
await fetch(`/store/subscriptions/${id}/resume`, { method: 'POST' });

// Cancel
await fetch(`/store/subscriptions/${id}/cancel`, { method: 'POST' });
```

## Payment Flow

### Initial Subscription Creation

1. Customer selects bundle product tagged as "subscription"
2. Customer optionally adds one-time items to cart
3. Checkout initiated via `/store/subscriptions` endpoint
4. Workflow:
   - Validates bundle product
   - Creates/retrieves Stripe customer
   - Creates Stripe subscription with:
     - Recurring item (bundle)
     - One-time invoice items (additional products)
   - Saves subscription to database
   - Snapshots bundle items
5. Returns `client_secret` for payment confirmation
6. Frontend confirms payment using Stripe Elements
7. Stripe processes first payment

### Recurring Payments

Stripe automatically charges customer monthly:
- Stripe creates invoice
- Stripe attempts payment
- Stripe sends webhook events (future implementation)

## Webhooks (Future Implementation)

When implementing webhooks, handle these events:
- `invoice.payment_succeeded`: Create recurring order
- `invoice.payment_failed`: Mark subscription past_due
- `customer.subscription.deleted`: Update status to cancelled
- `customer.subscription.updated`: Sync status changes

Webhook URL: `https://yourbackend.com/webhooks/stripe`

## Provider Agnostic Design

The subscription module is designed to support multiple payment providers:

```typescript
export enum SubscriptionProvider {
  STRIPE = 'stripe',
  // PAYPAL = 'paypal', // Future
}
```

To add a new provider:
1. Create provider-specific steps (e.g., `create-paypal-subscription`)
2. Add provider logic in workflows
3. Update types and enums
4. Implement provider-specific API integration

## Error Handling

All errors are logged using Medusa's logger:
```typescript
container.resolve('logger').error('Error message', error);
```

**Payment Success, Subscription Fails:**
- Stripe subscription is rolled back automatically
- Transaction is atomic via workflow compensation
- Error logged for manual review

## Database Schema

### subscription
```sql
- id (PK)
- customer_id (indexed)
- bundle_product_id
- provider
- provider_subscription_id (indexed)
- provider_customer_id
- status (indexed)
- subscription_price
- currency
- current_period_start
- current_period_end
- next_billing_date
- metadata (jsonb)
- created_at, updated_at, deleted_at
```

### subscription_item
```sql
- id (PK)
- subscription_id (FK, indexed)
- product_id
- variant_id
- quantity
- product_snapshot (jsonb)
- created_at, updated_at, deleted_at
```

## Testing

### Manual Testing Checklist

- [ ] Create subscription with bundle product
- [ ] Confirm payment succeeds
- [ ] Verify subscription saved in database
- [ ] Verify items snapshot created
- [ ] Pause subscription
- [ ] Resume subscription
- [ ] Cancel subscription
- [ ] Create subscription with one-time items
- [ ] Test with invalid bundle ID
- [ ] Test with non-subscription bundle
- [ ] Test unauthorized access

### Stripe Test Cards

- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`
- Requires Authentication: `4000 0025 0000 3155`

## Future Enhancements

1. **Webhook Integration**: Auto-create orders on recurring payments
2. **Subscription Modifications**: Allow users to update bundle contents
3. **Proration**: Handle mid-cycle changes
4. **Multiple Payment Methods**: Let users change payment method
5. **Trial Periods**: Support free trial before first charge
6. **Usage-Based Billing**: Track and bill based on actual usage
7. **Dunning Management**: Handle failed payment retries
8. **Customer Portal**: Self-service subscription management UI
9. **Analytics**: Track MRR, churn, LTV metrics
10. **Multiple Providers**: Add PayPal, Apple Pay, Google Pay

## Troubleshooting

**Subscription creation fails:**
- Check STRIPE_API_KEY is set correctly
- Verify bundle has subscription_price
- Check bundle is tagged with "subscription"
- Review logs for detailed error

**Payment Intent confirmation fails:**
- Verify client_secret is valid
- Check Stripe publishable key matches secret key environment
- Test with different test cards

**Customer not found in Stripe:**
- First purchase auto-creates Stripe customer
- Check customer metadata for stripe_customer_id

## Support

For issues or questions:
1. Check logs: `container.resolve('logger')`
2. Verify Stripe Dashboard for subscription status
3. Check database for subscription records
4. Review Medusa documentation: https://docs.medusajs.com
