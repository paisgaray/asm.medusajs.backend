# Subscription Integration with Cart/Checkout Flow

## Current Implementation

I've created a subscriber that listens to the `order.placed` event, but this approach has a **limitation**: by the time the order is placed, payment has already been collected via standard payment flow, not via Stripe subscription.

## The Problem

There are two different payment flows:

### Standard Flow (Current):
1. Add items to cart
2. Add payment to cart (creates payment session)
3. Complete cart → Creates order + charges payment
4. `order.placed` event fires

### Subscription Flow (What We Need):
1. Add subscription items to cart
2. **Create Stripe subscription** (which creates the first invoice with payment intent)
3. Frontend confirms payment using Stripe Elements
4. **Then** complete the order

## Solution Options

### Option 1: Separate Subscription Checkout (Recommended for Testing)

Keep subscription purchases separate from regular orders:

**Flow:**
1. User selects a subscription product
2. Frontend calls `POST /store/subscriptions` directly (not through cart)
3. Backend creates Stripe subscription and returns `client_secret`
4. Frontend confirms payment with Stripe Elements
5. Once payment succeeds, optionally create an order record

**Pros:**
- Simpler to implement and test
- Clear separation of concerns
- Easier to handle subscription-specific logic

**Cons:**
- Can't mix subscription and one-time products in same checkout

### Option 2: Enhanced Cart Workflow (Production Approach)

Modify cart completion to handle subscriptions:

**Implementation:**
1. Create a custom cart completion workflow step
2. Detect if cart contains subscription items
3. If yes, create Stripe subscription first
4. Return client_secret to frontend
5. Frontend confirms payment
6. Then complete the order

**Requires:**
- Custom cart complete API route
- Modified checkout flow in frontend
- More complex state management

### Option 3: Hybrid Approach (Your Use Case)

Since you mentioned "one-time products added to first invoice":

**Flow:**
1. Detect subscription items in cart during checkout
2. Separate subscription items from one-time items
3. Create Stripe subscription with `add_invoice_items` for one-time products
4. Complete order after payment confirmation

## Recommended Implementation for Testing

I recommend **Option 1** for initial testing, then migrate to **Option 3** for production.

### For Now (Testing):

Use the direct API approach:

```typescript
// Frontend - Checkout with subscription
const response = await fetch('/store/subscriptions', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    customer_id: customerId,
    bundle_product_id: subscriptionBundleId,
    one_time_items: regularCartItems.map(item => ({
      price_data: {
        currency: 'usd',
        product: item.product_id,
        unit_amount: item.unit_price * 100,
      },
      quantity: item.quantity,
    })),
  }),
});

const { subscription, client_secret } = await response.json();

// Confirm payment
const stripe = await loadStripe(publicKey);
await stripe.confirmPayment({
  clientSecret: client_secret,
  confirmParams: {
    return_url: `${window.location.origin}/subscription-success`,
  },
});
```

### For Production (Option 3):

Create a custom checkout endpoint:

```typescript
// src/api/store/checkout/route.ts
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const { cart_id } = req.body;
  
  // 1. Get cart with items
  // 2. Detect subscription items
  // 3. If has subscriptions:
  //    - Create Stripe subscriptions
  //    - Return client_secret
  //    - Frontend confirms payment
  //    - Call /checkout/complete after payment
  // 4. If no subscriptions:
  //    - Use standard Medusa checkout
};
```

## What the Subscriber Does

The `subscription-creation.ts` subscriber I created will:
- Listen to `order.placed` events
- Check if order contains subscription products (tagged "subscription")
- Create subscription records in the database
- **Limitation**: Won't handle Stripe payment since it's already been processed

This subscriber is useful for:
- Creating subscription records after manual admin orders
- Migrating existing orders to subscriptions
- Fallback/logging purposes

## Testing Your Implementation

### Step 1: Test Subscription Creation API Directly

```bash
# Create a subscription directly (bypasses cart)
curl -X POST http://localhost:9000/store/subscriptions \
  -H "Content-Type: application/json" \
  -d '{
    "customer_id": "cus_123",
    "bundle_product_id": "bundle_123"
  }'
```

You should get back:
```json
{
  "subscription": { "id": "sub_123", ... },
  "client_secret": "pi_123_secret_456"
}
```

### Step 2: Frontend Integration

```typescript
// 1. Call API to create subscription
const { subscription, client_secret } = await createSubscription({
  bundleId,
  customerId,
});

// 2. Confirm payment with Stripe
const stripe = await loadStripe(STRIPE_PUBLIC_KEY);
const { error } = await stripe.confirmPayment({
  clientSecret: client_secret,
  confirmParams: {
    return_url: '/subscription-success',
  },
});

if (error) {
  // Handle error
} else {
  // Subscription is active!
}
```

### Step 3: Verify

1. Check database for subscription record
2. Check Stripe Dashboard for subscription
3. Check subscription items were snapshotted

## Next Steps for Full Integration

1. **Immediate (for testing):**
   - Use direct subscription API (`POST /store/subscriptions`)
   - Test with Stripe test cards
   - Verify subscription creation

2. **Short-term (for production):**
   - Create custom checkout endpoint that detects subscription items
   - Handle mixed cart (subscription + one-time items)
   - Integrate payment confirmation flow

3. **Long-term:**
   - Implement webhooks for recurring payments
   - Create customer subscription management portal
   - Handle failed payment scenarios

## Summary

- ✅ Subscriber created (for reference/fallback)
- ⚠️ Direct subscription API is ready for testing
- 🚧 Full cart integration needs custom checkout workflow
- 💡 Start with direct API, migrate to cart integration later

The code is ready to test! Use the direct subscription API endpoint first.
