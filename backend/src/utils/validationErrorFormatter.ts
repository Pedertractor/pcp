import type { FastifyValidationError } from '../types/error.types.js';

export function validationErrorFormatter(
  error: FastifyValidationError,
): string {
  let result = '';
  error.validation.forEach((err) => {
    result += `${err.keyword} 
    ${err.instancePath}: ${err.message}
    `;
  });
  return result;
}
