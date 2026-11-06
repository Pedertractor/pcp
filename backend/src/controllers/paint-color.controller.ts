import type { FastifyReply, FastifyRequest } from 'fastify';

import type {
  BlockPaintColorParams,
  UpdateBlockPaintColorBody,
} from '../schemas/paint-color.schemas.js';
import type { BlockIdParams } from '../schemas/block.schemas.js';
import { PaintColorService } from '../services/paint-color.service.js';

export async function listBlockPaintColorsController(
  req: FastifyRequest<{ Params: BlockIdParams }>,
  reply: FastifyReply,
) {
  const items = await new PaintColorService(
    req.server.prisma,
  ).listColorsForBlock(req.params.id);
  return reply.status(200).send(items);
}

export async function updateBlockPaintColorController(
  req: FastifyRequest<{
    Params: BlockPaintColorParams;
    Body: UpdateBlockPaintColorBody;
  }>,
  reply: FastifyReply,
) {
  const item = await new PaintColorService(req.server.prisma).setBlockPaintColorMapHex(
    req.params.id,
    req.params.colorId,
    req.body.mapHex,
  );
  return reply.status(200).send(item);
}
