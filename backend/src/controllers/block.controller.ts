import type { FastifyReply, FastifyRequest } from 'fastify';
import {
  BLOCK_PLAN_MAX_BYTES,
  isBlockPlanMimeType,
} from '../lib/block-plan-storage.js';
import { AppError } from '../lib/errors.js';
import type {
  BlockIdParams,
  CreateBlockBody,
  UpdateBlockCostCentersBody,
} from '../schemas/block.schemas.js';
import { BlockService } from '../services/block.service.js';

export async function listBlocksController(
  req: FastifyRequest,
  reply: FastifyReply,
) {
  const blockService = new BlockService(req.server.prisma);
  const blocks = await blockService.listBlocks();
  return reply.status(200).send(blocks);
}

export async function getBlockController(
  req: FastifyRequest<{ Params: BlockIdParams }>,
  reply: FastifyReply,
) {
  const blockService = new BlockService(req.server.prisma);
  const block = await blockService.getBlock(req.params.id);
  return reply.status(200).send(block);
}

export async function createBlockController(
  req: FastifyRequest<{ Body: CreateBlockBody }>,
  reply: FastifyReply,
) {
  const blockService = new BlockService(req.server.prisma);
  const block = await blockService.createBlock(req.body);
  return reply.status(201).send(block);
}

export async function updateBlockCostCentersController(
  req: FastifyRequest<{
    Params: BlockIdParams;
    Body: UpdateBlockCostCentersBody;
  }>,
  reply: FastifyReply,
) {
  const blockService = new BlockService(req.server.prisma);
  const block = await blockService.updateCostCenters(req.params.id, req.body);
  return reply.status(200).send(block);
}

export async function uploadBlockPlanImageController(
  req: FastifyRequest<{ Params: BlockIdParams }>,
  reply: FastifyReply,
) {
  if (!req.isMultipart()) {
    throw new AppError('Envie a imagem da planta como multipart/form-data.', 400);
  }

  const file = await req.file();
  if (!file) {
    throw new AppError('Selecione a imagem da planta.', 400);
  }

  if (!isBlockPlanMimeType(file.mimetype)) {
    file.file.resume();
    throw new AppError('Use uma imagem PNG, JPG ou WEBP.', 400);
  }

  const buffer = await file.toBuffer();
  if (file.file.truncated || buffer.length > BLOCK_PLAN_MAX_BYTES) {
    throw new AppError('A imagem deve ter no máximo 15 MB.', 413);
  }
  if (buffer.length === 0) {
    throw new AppError('A imagem enviada está vazia.', 400);
  }

  const blockService = new BlockService(req.server.prisma);
  const block = await blockService.replacePlanImage(req.params.id, {
    buffer,
    mimeType: file.mimetype,
    originalName: file.filename,
  });
  return reply.status(200).send(block);
}

export async function getBlockPlanImageController(
  req: FastifyRequest<{ Params: BlockIdParams }>,
  reply: FastifyReply,
) {
  const blockService = new BlockService(req.server.prisma);
  const file = await blockService.getPlanImageFile(req.params.id);

  return reply
    .header('Content-Type', file.mimeType)
    .header('Content-Length', file.size)
    .header('Cache-Control', 'private, max-age=31536000, immutable')
    .send(file.stream);
}
