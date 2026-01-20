/**
 * Helper: Emit Order Invoiced Event
 * 
 * Use este helper para disparar o evento order.invoiced quando:
 * - Sistema fatura o pedido (invoice gerada)
 * - ERP/Sistema contábil confirma faturamento
 * - Admin marca pedido como faturado
 * 
 * Exemplo de uso:
 * 
 * ```typescript
 * import { emitOrderInvoicedEvent } from './helpers/emit-order-invoiced'
 * 
 * // No seu workflow/step onde processa faturamento:
 * if (orderInvoiced) {
 *   await emitOrderInvoicedEvent(container, orderId)
 * }
 * ```
 */

import type { MedusaContainer } from '@medusajs/framework/types';
import { Modules } from '@medusajs/framework/utils';

export async function emitOrderInvoicedEvent(container: MedusaContainer, orderId: string) {
  const eventBusService = container.resolve(Modules.EVENT_BUS);

  console.log(`[Helper] Disparando evento order.invoiced para order_id: ${orderId}`);

  await eventBusService.emit('order.invoiced', {
    id: orderId,
  });

  console.log(`[Helper] Evento order.invoiced disparado com sucesso`);
}
