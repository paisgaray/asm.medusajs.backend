import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework';

import {
  removeBundledProductItemWorkflow,
  RemoveBundledProductItemWorkflowInput,
} from '../../../../../../workflows/bundled-product/workflows/remove-bundled-product-item';
import {
  updateBundledProductItemWorkflow,
  UpdateBundledProductItemWorkflowInput,
} from '../../../../../../workflows/bundled-product/workflows/update-bundled-product-item';
import { UpdateBundledProductItemSchema } from '../../../validators';

export async function PUT(req: AuthenticatedMedusaRequest<UpdateBundledProductItemSchema>, res: MedusaResponse) {
  const { result: bundledProduct } = await updateBundledProductItemWorkflow(req.scope).run({
    input: {
      id: req.params.itemId,
      bundle_id: req.params.id,
      ...req.validatedBody,
    } as UpdateBundledProductItemWorkflowInput,
  });

  res.json({
    bundled_product: bundledProduct,
  });
}
export async function DELETE(req: AuthenticatedMedusaRequest, res: MedusaResponse): Promise<void> {
  const { result } = await removeBundledProductItemWorkflow(req.scope).run({
    input: { bundle_id: req.params.id, id: req.params.itemId } as RemoveBundledProductItemWorkflowInput,
  });

  res.json(result);
}
