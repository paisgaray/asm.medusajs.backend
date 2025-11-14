import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework';

import {
  removeBundledProductWorkflow,
  RemoveBundledProductWorkflowInput,
} from '../../../../workflows/bundled-product/workflows/remove-bundled-product';
import {
  updateBundledProductWorkflow,
  UpdateBundledProductWorkflowInput,
} from '../../../../workflows/bundled-product/workflows/update-bundled-product';
import { UpdateBundledProductSchema } from '../validators';

export async function PUT(req: AuthenticatedMedusaRequest<UpdateBundledProductSchema>, res: MedusaResponse) {
  const { result: bundledProduct } = await updateBundledProductWorkflow(req.scope).run({
    input: { id: req.params.id, ...req.validatedBody } as UpdateBundledProductWorkflowInput,
  });

  res.json({
    bundled_product: bundledProduct,
  });
}

export async function DELETE(req: AuthenticatedMedusaRequest, res: MedusaResponse): Promise<void> {
  const { result } = await removeBundledProductWorkflow(req.scope).run({
    input: { id: req.params.id } as RemoveBundledProductWorkflowInput,
  });

  res.json(result);
}
