import type { MedusaContainer } from '@medusajs/framework/types';
import { Modules } from '@medusajs/framework/utils';

export async function emitOrderInvoicedEvent(container: MedusaContainer, orderId: string): Promise<void> {
  const eventBusService = container.resolve(Modules.EVENT_BUS);

  console.log(`[Helper] Disparando evento order.invoiced para order_id: ${orderId}`);

  await eventBusService.emit({
    name: 'order.invoiced',
    data: { id: orderId },
  });

  console.log(`[Helper] Evento order.invoiced disparado com sucesso`);
}
