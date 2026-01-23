import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework';

import {
  addBundledProductItemWorkflow,
  AddBundledProductItemWorkflowInput,
} from '../../../../workflows/bundled-product/workflows/add-bundled-product-item';
import {
  removeBundledProductWorkflow,
  RemoveBundledProductWorkflowInput,
} from '../../../../workflows/bundled-product/workflows/remove-bundled-product';
import {
  updateBundledProductWorkflow,
  UpdateBundledProductWorkflowInput,
} from '../../../../workflows/bundled-product/workflows/update-bundled-product';
import { AddBundledProductItemSchema, UpdateBundledProductSchema } from '../validators';

export async function POST(req: AuthenticatedMedusaRequest<AddBundledProductItemSchema>, res: MedusaResponse) {
  const { result: bundledProduct } = await addBundledProductItemWorkflow(req.scope).run({
    input: {
      bundle_id: req.params.id,
      item: req.validatedBody,
    } as AddBundledProductItemWorkflowInput,
  });

  res.json({
    bundled_product: bundledProduct,
  });
}

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
