import type { FastifyReply, FastifyRequest } from 'fastify';
import { SectorService } from '../services/sector.service.js';

export async function listSectorsController(
  req: FastifyRequest,
  reply: FastifyReply,
) {
  const sectorService = new SectorService(req.server.prisma);
  const sectors = await sectorService.listSectorOptions();
  return reply.status(200).send(sectors);
}
