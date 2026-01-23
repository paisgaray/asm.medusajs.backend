import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk';

export interface ValidateEmailInput {
  email: string;
  first_name?: string;
  last_name?: string;
}

export interface ValidateEmailOutput {
  email: string;
  first_name?: string;
  last_name?: string;
}

export const validateEmailStep = createStep(
  'validate-email-step',
  async (input: ValidateEmailInput) => {
    const { email, first_name, last_name } = input;

    if (!email || typeof email !== 'string') {
      throw new Error('Email é obrigatório');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error('Email inválido');
    }

    const normalizedEmail = email.toLowerCase().trim();

    return new StepResponse({
      email: normalizedEmail,
      first_name: first_name?.trim(),
      last_name: last_name?.trim(),
    });
  },
);
