import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework';

import {
  removeBundledProductWorkflow,
  RemoveBundledProductWorkflowInput,
} from '../../../../workflows/bundled-product/workflows/remove-bundled-product';

export async function DELETE(req: AuthenticatedMedusaRequest, res: MedusaResponse): Promise<void> {
  const { result } = await removeBundledProductWorkflow(req.scope).run({
    input: { id: req.params.id } as RemoveBundledProductWorkflowInput,
  });

  res.json(result);
}
