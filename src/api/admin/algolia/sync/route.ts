import { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';
import { Modules } from '@medusajs/framework/utils';

export async function POST(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  const eventModuleService = req.scope.resolve(Modules.EVENT_BUS);

  await eventModuleService.emit({
    name: 'algolia.sync',
    data: {},
  });

  res.json({
    message: 'Syncing data to Algolia',
  });
}
