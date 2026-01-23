import { createWorkflow, WorkflowResponse } from '@medusajs/framework/workflows-sdk';

import { saveSubscriberStep } from './steps/save-subscriber-step';
import { validateEmailStep } from './steps/validate-email-step';

export interface SubscribeNewsletterInput {
  email: string;
  first_name?: string;
  last_name?: string;
}

export interface SubscribeNewsletterOutput {
  success: boolean;
  message: string;
  subscriber_id?: string;
}

export const subscribeNewsletterWorkflow = createWorkflow(
  'subscribe-newsletter-workflow',
  (input: SubscribeNewsletterInput) => {
    const validatedEmail = validateEmailStep(input);

    const result = saveSubscriberStep(validatedEmail);

    return new WorkflowResponse(result);
  },
);
