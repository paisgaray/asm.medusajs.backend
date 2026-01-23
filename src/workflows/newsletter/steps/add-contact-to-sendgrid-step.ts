import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk';

import { sendgridClient } from '../../../utils/sendgrid-client';

export interface AddContactInput {
  email: string;
  first_name?: string;
  last_name?: string;
}

export interface AddContactOutput {
  success: boolean;
  message: string;
  contact_id?: string;
}

export const addContactToSendGridStep = createStep('add-contact-to-sendgrid-step', async (input: AddContactInput) => {
  const { email, first_name, last_name } = input;

  try {
    const contactData: Record<string, unknown> = {
      email,
    };

    if (first_name) {
      contactData.first_name = first_name;
    }

    if (last_name) {
      contactData.last_name = last_name;
    }

    const response = await sendgridClient.request({
      url: '/v3/marketing/contacts',
      method: 'PUT',
      body: {
        contacts: [contactData],
      },
    });

    const jobId = (response[1]?.body as { job_id?: string })?.job_id;

    return new StepResponse({
      success: true,
      message: 'Email adicionado à newsletter com sucesso',
      contact_id: jobId,
    });
  } catch (error) {
    console.error('[SendGrid Newsletter] Erro ao adicionar contato:', error);
    throw new Error('Falha ao adicionar email à newsletter');
  }
});
