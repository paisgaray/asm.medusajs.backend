import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework/http';

import { createContactWorkflow, CreateContactWorkflowInput } from '../../../workflows/contact/workflows/create-contact';
import type { CreateContactSchema } from './validators';

export async function POST(req: AuthenticatedMedusaRequest<CreateContactSchema>, res: MedusaResponse) {
  console.log({ validatedBody: req.validatedBody });

  const { result: contact } = await createContactWorkflow(req.scope).run({
    input: { contact: req.validatedBody } as CreateContactWorkflowInput,
  });

  res.json({
    contact,
  });
}
