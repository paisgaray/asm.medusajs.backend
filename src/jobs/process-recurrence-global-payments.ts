import { MedusaContainer } from '@medusajs/framework/types';

import { executeRecurence } from '../workflows/recurrence/workflows/execute-recurrence';

export default async function processRecurrenceGlobalPayments(container: MedusaContainer) {
  const logger = container.resolve('logger');

  logger.info('Executando tarefa 4 vezes por dia...');

  await executeRecurence(container).run();
}

export const config = {
  name: 'process-recurrence-global-payments',
  schedule: '0 0,6,12,18 * * *', // Executa às 00h, 06h, 12h e 18h
};
