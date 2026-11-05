import type { FastifyInstance } from 'fastify';
import { listSectorsController } from '../controllers/sector.controller.js';
import { commonErrors } from '../schemas/error.schemas.js';
import { listSectorsResponseSchema } from '../schemas/sector.schemas.js';

export function sectorRoutes(fastify: FastifyInstance) {
  fastify.get(
    '',
    {
      schema: {
        summary: 'List active sectors from the base API',
        tags: ['Sector'],
        security: [{ cookieAuth: [] }],
        response: {
          200: listSectorsResponseSchema.describe(
            'List sectors success response',
          ),
          ...commonErrors,
        },
      },
      onRequest: [fastify.authenticate],
    },
    listSectorsController,
  );
}
