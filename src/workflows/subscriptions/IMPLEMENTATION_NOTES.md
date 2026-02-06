# Implementation Notes & Next Steps

## Current Status

✅ **Completed:**
- Stripe SDK installed
- Subscription module created with models and service
- Workflow steps created for subscription lifecycle
- Workflows created (create, pause, resume, cancel)
- Store and Admin API routes created
- Stripe payment provider configured in medusa-config.ts
- Database migrations created
- Links module created for subscriptions
- Bundle model extended with subscription fields

## Known Issues & TODOs

### 1. Authentication Context
**Issue:** Store API routes use `req.auth_context?.actor_id` which doesn't exist on MedusaRequest type in the current Medusa version.

**Temporary Solution:** 
- For testing, accept `customer_id` in request body (like wishlist module does)
- Or use middleware to set customer_id from auth token

**TODO:** Research correct way to get authenticated customer ID in Medusa v2 store routes.

### 2. TypeScript Type Errors
**Issue:** TypeScript doesn't recognize generated methods from MedusaService (createSubscriptions, listSubscriptions, etc.)

**Explanation:** These methods ARE generated at runtime by the service factory. The errors are just TypeScript not knowing about them.

**Solution:** Add type declarations or use `// @ts-expect-error` comments (see Medusa docs example).

### 3. Bundle Product Methods
**Issue:** `retrieveBundle` method may need to be verified against actual bundled-product service implementation.

**TODO:** Check bundled-product service for correct method names.

### 4. Webhooks Not Implemented
Stripe webhooks are not yet implemented. This means:
- Recurring payments won't create new orders automatically
- Payment failures won't update subscription status
- Subscription updates from Stripe dashboard won't sync

**TODO:** Implement webhook handler at `/api/webhooks/stripe/route.ts`

### 5. Testing Required
**TODO:**
- Run migrations: `npm run migrations`
- Test subscription creation flow
- Test payment confirmation with Stripe Elements
- Test pause/resume/cancel operations
- Add integration tests

## Next Implementation Steps

### Step 1: Fix TypeScript Errors
Add type definitions for service methods:

```typescript
// src/modules/subscriptions/service.ts
import { MedusaService } from '@medusajs/framework/utils';
import { Subscription } from './models/subscription';
import { SubscriptionItem } from './models/subscription-item';

class SubscriptionModuleService extends MedusaService({
  Subscription,
  SubscriptionItem,
}) {
  // Type hints for generated methods
  declare createSubscriptions: (data: any) => Promise<any>;
  declare listSubscriptions: (filters?: any, config?: any) => Promise<any[]>;
  declare retrieveSubscription: (id: string, config?: any) => Promise<any>;
  declare updateSubscriptions: (data: any[]) => Promise<any>;
  declare deleteSubscriptions: (ids: string[]) => Promise<void>;
  declare createSubscriptionItems: (data: any[]) => Promise<any[]>;
  declare deleteSubscriptionItems: (ids: string[]) => Promise<void>;
}

export default SubscriptionModuleService;
```

### Step 2: Fix Authentication in Store Routes
Option A - Use customer_id from body (temporary):
```typescript
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const { customer_id, bundle_product_id } = req.body;
  // ...
};
```

Option B - Use authenticated  middleware:
```typescript
// src/api/middlewares.ts
import { authenticate } from '@medusajs/medusa';

export const config = {
  routes: [
    {
      matcher: '/store/subscriptions*',
      middlewares: [authenticate('customer', ['session', 'bearer'])],
    },
  ],
};
```

### Step 3: Test Bundle Product Integration
Verify the bundle service has these methods:
- `retrieveBundle(id, config)`
- Check if items are properly related

### Step 4: Implement Webhooks
Create `/src/api/webhooks/stripe/route.ts`:

```typescript
import { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';
import Stripe from 'stripe';

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const stripe = new Stripe(process.env.STRIPE_API_KEY!);
  const sig = req.headers['stripe-signature'];
  
  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig!,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  switch (event.type) {
    case 'invoice.payment_succeeded':
      // Create recurring order
      break;
    case 'invoice.payment_failed':
      // Update subscription status
      break;
    case 'customer.subscription.deleted':
      // Sync cancellation
      break;
  }

  res.json({ received: true });
};
```

### Step 5: Frontend Integration Guide

#### Display Subscription Options
```typescript
// Check if product can be subscribed to
const isSubscribable = bundle.tags?.some(t => t.value === 'subscription') 
  && bundle.subscription_price;

if (isSubscribable) {
  // Show subscription UI with price: bundle.subscription_price
}
```

#### Create Subscription
```typescript
const response = await fetch('/store/subscriptions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${customerToken}`, // If using bearer auth
  },
  body: JSON.stringify({
    customer_id: customerId, // Temporary until auth is fixed
    bundle_product_id: bundle.id,
    one_time_items: cart.items.filter(i => !i.is_subscription).map(i => ({
      price_data: {
        currency: 'usd',
        product: i.product_id,
        unit_amount: i.unit_price * 100,
      },
      quantity: i.quantity,
    })),
  }),
});

const { subscription, client_secret } = await response.json();
```

#### Confirm Payment with Stripe
```typescript
const stripe = await loadStripe(process.env.NEXT_PUBLIC_STRIPE_KEY!);

const { error } = await stripe.confirmPayment({
  clientSecret: client_secret,
  confirmParams: {
    return_url: `${window.location.origin}/subscription-success`,
  },
});
```

## Environment Variables Needed

```bash
# .env
STRIPE_API_KEY=sk_test_...           # Stripe secret key
STRIPE_WEBHOOK_SECRET=whsec_...      # For webhook verification (when implemented)
```

## Database Migrations

Run migrations to create tables:
```bash
npm run migrations
```

This creates:
- `subscription` table
- `subscription_item` table
- Adds `subscription_price` and `currency` to `bundle` table

## API Endpoints Reference

### Store API (Requires Authentication)

**GET /store/subscriptions**
- List customer's subscriptions
- Response: `{ subscriptions: [...] }`

**POST /store/subscriptions**
- Create new subscription
- Body: `{ customer_id, bundle_product_id, one_time_items? }`
- Response: `{ subscription, client_secret }`

**GET /store/subscriptions/:id**
- Get subscription details
- Response: `{ subscription }`

**POST /store/subscriptions/:id/pause**
- Pause subscription
- Response: `{ subscription_id, status, paused_at }`

**POST /store/subscriptions/:id/resume**
- Resume subscription
- Response: `{ subscription_id, status, resumed_at }`

**POST /store/subscriptions/:id/cancel**
- Cancel subscription immediately
- Response: `{ subscription_id, status, cancelled_at }`

### Admin API

**GET /admin/subscriptions**
- List all subscriptions
- Query: `customer_id`, `status`, `limit`, `offset`
- Response: `{ subscriptions, count, limit, offset }`

**POST /admin/subscriptions**
- Create subscription for customer
- Body: `{ customer_id, bundle_product_id, one_time_items? }`

**GET /admin/subscriptions/:id**
- Get subscription details

**POST /admin/subscriptions/:id**
- Update subscription
- Body: `{ status?, metadata? }`

**POST /admin/subscriptions/:id/cancel**
- Cancel subscription

## Testing Guide

### Prerequisites
```bash
# 1. Add Stripe API key to .env
STRIPE_API_KEY=sk_test_your_key_here

# 2. Run migrations
npm run migrations

# 3. Start server
npm run dev
```

### Testing Checklist

**Setup:**
- [ ] Run `npm run migrations` successfully
- [ ] Start dev server: `npm run dev`
- [ ] Configure Stripe in Admin Dashboard (Settings → Regions → Add Stripe)
- [ ] Create bundle product with `metadata.subscription_price = 2999` (for $29.99)
- [ ] Tag product with "subscription"

**API Testing:**
- [ ] Test creating subscription via `POST /store/subscriptions`
- [ ] Verify you receive `client_secret` in response
- [ ] Test confirming payment with Stripe test card (4242 4242 4242 4242)
- [ ] Verify subscription record in database
- [ ] Verify subscription in Stripe Dashboard
- [ ] Test pause subscription: `POST /store/subscriptions/:id/pause`
- [ ] Test resume subscription: `POST /store/subscriptions/:id/resume`
- [ ] Test cancel subscription: `POST /store/subscriptions/:id/cancel`
- [ ] Test with one-time items in first invoice

### Quick Test with cURL

```bash
# Replace with your actual IDs
CUSTOMER_ID="cus_abc123"
BUNDLE_ID="bundle_xyz789"

# Create subscription
curl -X POST http://localhost:9000/store/subscriptions \
  -H "Content-Type: application/json" \
  -d "{
    \"customer_id\": \"$CUSTOMER_ID\",
    \"bundle_product_id\": \"$BUNDLE_ID\"
  }"
```

### Important Note on Cart Integration

⚠️ **The subscription creation is NOT automatically triggered on cart completion yet.**

For now, test using the direct API endpoint (`POST /store/subscriptions`).

To integrate with cart/checkout, see `INTEGRATION_GUIDE.md` for implementation options.

## Future Enhancements

1. **Implement Webhooks** - Auto-create orders on recurring payments
2. **Add Customer Portal** - UI for customers to manage subscriptions
3. **Support Multiple Intervals** - Weekly, quarterly, annual
4. **Proration** - Handle mid-cycle changes
5. **Trial Periods** - Free trials before first charge
6. **Dunning Management** - Handle failed payment retries
7. **Analytics Dashboard** - MRR, churn, LTV metrics
8. **Additional Payment Providers** - PayPal, Apple Pay, etc.

## Support

If you encounter issues:
1. Check server logs for detailed errors
2. Verify environment variables are set
3. Check Stripe Dashboard for subscription status
4. Review database tables for subscription records
5. See STRIPE_SUBSCRIPTION_README.md for full documentation
