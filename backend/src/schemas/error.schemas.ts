import z from 'zod';

export const errorSchema = z.object({
  message: z.string().describe('Error description'),
});

export const validationErrorSchema = z.object({
  message: z.string().default('Validation error'),
  errors: z.string().describe('Detailed validation errors').optional(),
});

export const commonErrors = {
  400: validationErrorSchema.describe(
    'Bad Request: Validation failed or malformed request',
  ),
  401: errorSchema.describe('Unauthorized: Invalid or missing token'),
  403: errorSchema.describe('Forbidden: Insufficient permissions'),
  404: errorSchema.describe('Not Found: Resource does not exist'),
  409: errorSchema.describe('Conflict: Unique constraint violated'),
  500: errorSchema.describe('Internal Server Error'),
};
