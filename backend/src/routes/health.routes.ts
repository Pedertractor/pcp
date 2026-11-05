import type { FastifyInstance } from 'fastify';

import { getHealthController } from '../controllers/health.controller.js';

export function healthRoutes(fastify: FastifyInstance) {
  fastify.get('/health', getHealthController);
}
