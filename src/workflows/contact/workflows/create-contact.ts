import { createWorkflow, WorkflowResponse } from '@medusajs/framework/workflows-sdk';

import { createContactStep } from '../steps/create-contact';

export type CreateContactWorkflowInput = {
  contact: {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    subject: string;
    message: string;
  };
};

export const createContactWorkflow = createWorkflow(
  'create-contact',
  ({ contact: contactData }: CreateContactWorkflowInput) => {
    const contact = createContactStep(contactData);

    return new WorkflowResponse(contact[0]);
  },
);
