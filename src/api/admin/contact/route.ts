import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework/http';

import { CONTACT_MODULE } from '../../../modules/contact';

export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const query = req.scope.resolve('query');

  const { data: contacts, metadata: { count, take, skip } = {} } = await query.graph({
    entity: CONTACT_MODULE,
    ...req.queryConfig,
  });

  res.json({
    contacts,
    count: count || 0,
    limit: take || 15,
    offset: skip || 0,
  });
}
