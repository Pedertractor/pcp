import type { FastifyInstance } from 'fastify';
import { csrfRoutes } from './csrf.routes.js';
import { userRoutes } from './user.routes.js';

export default function mainRoutes(fastify: FastifyInstance) {
  fastify.register(csrfRoutes);
  fastify.register(userRoutes, { prefix: '/users' });
}
