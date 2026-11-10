import type { FastifyInstance } from 'fastify';
import { blockRoutes } from './block.routes.js';
import { pmpRoutes } from './pmp.routes.js';
import { csrfRoutes } from './csrf.routes.js';
import { sectorRoutes } from './sector.routes.js';
import { userRoutes } from './user.routes.js';

export default function mainRoutes(fastify: FastifyInstance) {
  fastify.register(csrfRoutes);
  fastify.register(userRoutes, { prefix: '/users' });
  fastify.register(blockRoutes, { prefix: '/blocks' });
  fastify.register(sectorRoutes, { prefix: '/sectors' });
  fastify.register(pmpRoutes, { prefix: '/pmp' });
}
