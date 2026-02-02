import { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const { id } = req.params;
  const query = req.scope.resolve('query');

  const { data } = await query.graph(
    {
      entity: 'contact',
      fields: ['*'],
      filters: { id },
    },
    {
      throwIfKeyNotFound: true,
    },
  );

  res.json(data[0]);
}
