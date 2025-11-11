import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework';

import {
  removeBundledProductItemWorkflow,
  RemoveBundledProductItemWorkflowInput,
} from '../../../../../../workflows/bundled-product/workflows/remove-bundled-product-item';

export async function DELETE(req: AuthenticatedMedusaRequest, res: MedusaResponse): Promise<void> {
  const { result } = await removeBundledProductItemWorkflow(req.scope).run({
    input: { bundle_id: req.params.id, id: req.params.itemId } as RemoveBundledProductItemWorkflowInput,
  });

  res.json(result);
}
