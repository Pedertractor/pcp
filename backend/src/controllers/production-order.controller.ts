import type { FastifyReply, FastifyRequest } from 'fastify';

import type { BlockIdParams } from '../schemas/block.schemas.js';
import { ProductionOrderService } from '../services/production-order.service.js';

export async function listBlockProductionOrdersController(
  req: FastifyRequest<{ Params: BlockIdParams }>,
  reply: FastifyReply,
) {
  const items = await new ProductionOrderService(
    req.server.prisma,
  ).listForBlock(req.params.id);
  return reply.status(200).send(items);
}
