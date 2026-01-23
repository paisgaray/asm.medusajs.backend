import { MedusaResponse } from '@medusajs/framework/http';

export function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    let message = error.message;
    try {
      const parsed = JSON.parse(message);
      if (parsed.message) {
        message = parsed.message;
      }
    } catch {
      // Use as is
    }
    return message;
  }

  if (typeof error === 'object' && error !== null) {
    try {
      const errorObj = error as { message?: string };
      if (errorObj.message) {
        try {
          const parsed = JSON.parse(errorObj.message);
          return parsed.message || errorObj.message;
        } catch {
          return errorObj.message;
        }
      }
      return JSON.stringify(error);
    } catch {
      return String(error);
    }
  }

  return String(error);
}

export function handleErrorResponse(res: MedusaResponse, statusCode: number, message: string, error: unknown): void {
  res.status(statusCode).json({
    message,
    error: extractErrorMessage(error),
  });
}
