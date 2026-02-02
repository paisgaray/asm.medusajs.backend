import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk';

import { CONTACT_MODULE } from '../../../modules/contact';
import ContactModuleService from '../../../modules/contact/service';

export type CreateContactStepInput = {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
};

export const createContactStep = createStep(
  'create-contact',
  async (input: CreateContactStepInput, { container }) => {
    const contactModuleService: ContactModuleService = container.resolve(CONTACT_MODULE);

    const contact = await contactModuleService.createContacts(input);

    return new StepResponse(contact, contact.id);
  },
  async (contactId, { container }) => {
    if (!contactId) return;

    const contactModuleService: ContactModuleService = container.resolve(CONTACT_MODULE);

    await contactModuleService.deleteContacts(contactId);
  },
);
