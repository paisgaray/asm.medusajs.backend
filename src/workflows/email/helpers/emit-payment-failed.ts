import type { MedusaContainer } from '@medusajs/framework/types';
import { Modules } from '@medusajs/framework/utils';

export async function emitPaymentFailedEvent(container: MedusaContainer, paymentId: string): Promise<void> {
  const eventBusService = container.resolve(Modules.EVENT_BUS);

  console.log(`[Helper] Disparando evento payment.failed para payment_id: ${paymentId}`);

  await eventBusService.emit({
    name: 'payment.failed',
    data: { id: paymentId },
  });

  console.log(`[Helper] Evento payment.failed disparado com sucesso`);
}
