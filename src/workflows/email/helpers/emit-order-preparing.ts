import type { MedusaContainer } from '@medusajs/framework/types';
import { Modules } from '@medusajs/framework/utils';

export async function emitOrderPreparingEvent(container: MedusaContainer, orderId: string): Promise<void> {
  const eventBusService = container.resolve(Modules.EVENT_BUS);

  console.log(`[Helper] Disparando evento order.preparing para order_id: ${orderId}`);

  await eventBusService.emit({
    name: 'order.preparing',
    data: { id: orderId },
  });

  console.log(`[Helper] Evento order.preparing disparado com sucesso`);
}
