import { createWorkflow, WorkflowResponse } from '@medusajs/framework/workflows-sdk';

import { autocompleteStep } from './steps/autocomplete-step';

type AutocompleteInput = {
  query: string;
  limit?: number;
  filters?: string;
  language?: string;
};

export const autocompleteWorkflow = createWorkflow('autocomplete', (input: AutocompleteInput) => {
  const results = autocompleteStep(input);
  return new WorkflowResponse({ suggestions: results });
});
