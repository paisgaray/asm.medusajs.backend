/**
 * Webhook: Payment Failed
 * Recebe notificações de payment providers quando pagamento falha
 * e dispara o evento payment.failed para enviar e-mail ASM-283
 *
 * IMPORTANTE: Configure este webhook no seu payment provider:
 * - Stripe: https://dashboard.stripe.com/webhooks
 * - PayPal: https://developer.paypal.com/dashboard/webhooks
 *
 * URL do webhook: https://seu-dominio.com/webhooks/payment-failed
 */

import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';
import { Modules } from '@medusajs/framework/utils';

import { SubscriptionProvider } from '../../../modules/subscriptions';

/**
 * Stripe Webhook Types
 */
interface StripePaymentIntent {
  id: string;
  metadata?: {
    payment_id?: string;
  };
  last_payment_error?: {
    message?: string;
  };
}

interface StripeWebhookEvent {
  type: string;
  data?: {
    object?: StripePaymentIntent;
  };
}

/**
 * PayPal Webhook Types
 */
interface PayPalResource {
  id?: string;
  custom_id?: string;
  status_details?: {
    reason?: string;
  };
}

interface PayPalWebhookEvent {
  event_type: string;
  resource?: PayPalResource;
}

/**
 * Generic Webhook Body (pode ser Stripe ou PayPal)
 */
type WebhookBody = StripeWebhookEvent | PayPalWebhookEvent | Record<string, unknown>;

/**
 * Payment Failed Event Data
 */
interface PaymentFailedEventData {
  id: string;
  reason?: string;
  provider?: string;
  provider_payment_id?: string;
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  try {
    const eventBusService = req.scope.resolve(Modules.EVENT_BUS);
    const body = req.body as WebhookBody;

    console.log('[Payment Failed Webhook] Recebido:', JSON.stringify(body, null, 2));

    // ============================================
    // STRIPE
    // ============================================
    if ('type' in body && body.type === 'payment_intent.payment_failed') {
      const stripeEvent = body as StripeWebhookEvent;
      const paymentIntentId = stripeEvent.data?.object?.id;
      const medusaPaymentId = stripeEvent.data?.object?.metadata?.payment_id;

      if (medusaPaymentId) {
        console.log(`[Stripe] Pagamento falhou - Payment ID: ${medusaPaymentId}`);

        const eventData: PaymentFailedEventData = {
          id: medusaPaymentId,
          reason: stripeEvent.data?.object?.last_payment_error?.message || 'Payment failed',
          provider: SubscriptionProvider.STRIPE,
          provider_payment_id: paymentIntentId,
        };

        await eventBusService.emit({
          name: 'payment.failed',
          data: eventData,
        });

        console.log(`[Stripe] Evento payment.failed disparado com sucesso`);
      }
    }

    // ============================================
    // PAYPAL
    // ============================================
    else if ('event_type' in body && body.event_type === 'PAYMENT.CAPTURE.DENIED') {
      const paypalEvent = body as PayPalWebhookEvent;
      const resourceId = paypalEvent.resource?.id;
      const medusaPaymentId = paypalEvent.resource?.custom_id;

      if (medusaPaymentId) {
        console.log(`[PayPal] Pagamento falhou - Payment ID: ${medusaPaymentId}`);

        const eventData: PaymentFailedEventData = {
          id: medusaPaymentId,
          reason: paypalEvent.resource?.status_details?.reason || 'Payment denied',
          provider: 'paypal',
          provider_payment_id: resourceId,
        };

        await eventBusService.emit({
          name: 'payment.failed',
          data: eventData,
        });

        console.log(`[PayPal] Evento payment.failed disparado com sucesso`);
      }
    }

    // ============================================
    // OUTROS PROVIDERS
    // ============================================
    // Adicione aqui a lógica para outros payment providers

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('[Payment Failed Webhook] Erro:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
