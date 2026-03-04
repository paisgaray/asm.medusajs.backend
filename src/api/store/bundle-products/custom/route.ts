import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework/http';

import {
  createCustomBundledProductWorkflow,
  CreateCustomBundledProductWorkflowInput,
} from '../../../../workflows/bundled-product/workflows/create-custom-bundle';
import type { CreateCustomBundledProductsSchema } from './validators';

export async function POST(req: AuthenticatedMedusaRequest<CreateCustomBundledProductsSchema>, res: MedusaResponse) {
  const { currency_code } = req.query;

  const { result: customBundle } = await createCustomBundledProductWorkflow(req.scope).run({
    input: { ...req.validatedBody, currency_code } as CreateCustomBundledProductWorkflowInput,
  });

  res.json(customBundle);
}
