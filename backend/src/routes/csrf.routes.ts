import type { FastifyInstance } from 'fastify';
import { getCsrfController } from '../controllers/user.controller.js';
import { csrfResponseSchema } from '../schemas/user.schemas.js';
import { commonErrors } from '../schemas/error.schemas.js';

export function csrfRoutes(fastify: FastifyInstance) {
  fastify.get(
    '/csrf',
    {
      schema: {
        summary: 'Get CSRF token',
        tags: ['Auth'],
        response: {
          200: csrfResponseSchema.describe('CSRF token'),
          ...commonErrors,
        },
      },
    },
    getCsrfController,
  );
}
