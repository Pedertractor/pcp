import type { FastifyReply, FastifyRequest } from 'fastify';

import { BlockService } from '../services/block.service.js';
import type {
  CreateBlockLineBody,
  LineMapPositionBody,
  LineParams,
  UpdateLineLabelAnchorBody,
  UpdateLineMachinesBody,
} from '../schemas/line.schemas.js';
import type { BlockIdParams } from '../schemas/block.schemas.js';

function blockService(request: FastifyRequest) {
  return new BlockService(request.server.prisma);
}

export async function deleteBlockLineController(
  req: FastifyRequest<{ Params: LineParams }>,
  reply: FastifyReply,
) {
  const block = await blockService(req).deleteLine(req.params.id, req.params.lineId);
  return reply.status(200).send(block);
}

export async function createBlockLineController(
  req: FastifyRequest<{ Params: BlockIdParams; Body: CreateBlockLineBody }>,
  reply: FastifyReply,
) {
  const block = await blockService(req).createLine(req.params.id, req.body.code);
  return reply.status(201).send(block);
}

export async function updateLineMachinesController(
  req: FastifyRequest<{ Params: LineParams; Body: UpdateLineMachinesBody }>,
  reply: FastifyReply,
) {
  const block = await blockService(req).updateLineMachines(
    req.params.id,
    req.params.lineId,
    req.body.machineIds,
  );
  return reply.status(200).send(block);
}

export async function updateLineMapPositionController(
  req: FastifyRequest<{ Params: LineParams; Body: LineMapPositionBody }>,
  reply: FastifyReply,
) {
  const line = await blockService(req).updateLineMapPosition(
    req.params.id,
    req.params.lineId,
    req.body,
  );
  return reply.status(200).send(line);
}

export async function clearLineMapPositionController(
  req: FastifyRequest<{ Params: LineParams }>,
  reply: FastifyReply,
) {
  const line = await blockService(req).clearLineMapPosition(
    req.params.id,
    req.params.lineId,
  );
  return reply.status(200).send(line);
}

export async function updateLineLabelAnchorController(
  req: FastifyRequest<{ Params: LineParams; Body: UpdateLineLabelAnchorBody }>,
  reply: FastifyReply,
) {
  const block = await blockService(req).updateLineLabelAnchor(
    req.params.id,
    req.params.lineId,
    req.body.labelAnchor,
  );
  return reply.status(200).send(block);
}
