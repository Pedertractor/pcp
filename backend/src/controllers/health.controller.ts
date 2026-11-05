import type { FastifyReply, FastifyRequest } from 'fastify';

import { env } from '../config/env.js';

export async function getHealthController(
  _request: FastifyRequest,
  reply: FastifyReply,
) {
  return reply.status(200).send({
    ok: true,
    service: env.NAME_APPLICATION,
    status: 'healthy',
    timestamp: new Date().toISOString(),
  });
}
