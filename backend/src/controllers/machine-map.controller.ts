import type { FastifyReply, FastifyRequest } from 'fastify';

import type { MachineMapPositionBody, MachineMapPositionParams } from '../schemas/machine-map.schemas.js';
import { BlockService } from '../services/block.service.js';

export async function updateMachineMapPositionController(
  req: FastifyRequest<{
    Params: MachineMapPositionParams;
    Body: MachineMapPositionBody;
  }>,
  reply: FastifyReply,
) {
  const blockService = new BlockService(req.server.prisma);
  const machine = await blockService.updateMachineMapPosition(
    req.params.id,
    req.params.machineId,
    req.body,
  );
  return reply.status(200).send(machine);
}

export async function clearMachineMapPositionController(
  req: FastifyRequest<{ Params: MachineMapPositionParams }>,
  reply: FastifyReply,
) {
  const blockService = new BlockService(req.server.prisma);
  const machine = await blockService.clearMachineMapPosition(
    req.params.id,
    req.params.machineId,
  );
  return reply.status(200).send(machine);
}
