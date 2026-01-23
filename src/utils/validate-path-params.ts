import type { MedusaNextFunction, MedusaRequest, MedusaResponse } from '@medusajs/framework/http';
import { MedusaError } from '@medusajs/framework/utils';
import { z } from 'zod';

export function validatePathParams(schema: z.ZodSchema) {
  return (req: MedusaRequest, _: MedusaResponse, next: MedusaNextFunction) => {
    try {
      req.params = schema.parse(req.params);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          `Invalid path parameters: ${error.errors.map((e) => e.message).join(', ')}`,
        );
      }
      throw error;
    }
  };
}
