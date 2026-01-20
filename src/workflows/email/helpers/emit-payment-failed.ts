/**
 * Helper: Emit Payment Failed Event
 * 
 * Use este helper para disparar o evento payment.failed quando:
 * - Gateway de pagamento rejeita
 * - Webhook de falha é recebido  
 * - Validação de pagamento falha
 * 
 * Exemplo de uso:
 * 
 * ```typescript
 * import { emitPaymentFailedEvent } from './helpers/emit-payment-failed'
 * 
 * // No seu workflow/step onde processa pagamento:
 * if (paymentRejected) {
 *   await emitPaymentFailedEvent(container, paymentId)
 * }
 * ```
 */

import type { MedusaContainer } from '@medusajs/framework/types';
import { Modules } from '@medusajs/framework/utils';

export async function emitPaymentFailedEvent(container: MedusaContainer, paymentId: string) {
  const eventBusService = container.resolve(Modules.EVENT_BUS);

  console.log(`[Helper] Disparando evento payment.failed para payment_id: ${paymentId}`);

  await eventBusService.emit('payment.failed', {
    id: paymentId,
  });

  console.log(`[Helper] Evento payment.failed disparado com sucesso`);
}
