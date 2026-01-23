import { createWorkflow, WorkflowResponse } from '@medusajs/framework/workflows-sdk';

import { addContactToSendGridStep } from './steps/add-contact-to-sendgrid-step';
import { validateEmailStep } from './steps/validate-email-step';

export interface SubscribeNewsletterInput {
  email: string;
  first_name?: string;
  last_name?: string;
}

export interface SubscribeNewsletterOutput {
  success: boolean;
  message: string;
  contact_id?: string;
}

export const subscribeNewsletterWorkflow = createWorkflow(
  'subscribe-newsletter-workflow',
  (input: SubscribeNewsletterInput) => {
    const validatedEmail = validateEmailStep(input);

    const result = addContactToSendGridStep(validatedEmail);

    return new WorkflowResponse(result);
  },
);
