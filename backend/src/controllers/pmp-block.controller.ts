import type { FastifyReply, FastifyRequest } from 'fastify';
import {
  fetchPartByPartCodeFromBaseApi,
  fetchPartByPartNumberFromBaseApi,
  pickFirstPartImagePublicUrl,
} from '../integrations/part-base-api.js';
import {
  isPmpBlockThemeMimeType,
  PMP_BLOCK_THEME_MAX_BYTES,
} from '../lib/pmp-block-theme-storage.js';
import { AppError } from '../lib/errors.js';
import type {
  CreatePmpBlockBody,
  PmpBlockIdParams,
  UpdatePmpBlockBody,
} from '../schemas/pmp-block.schemas.js';
import type {
  OpenPmpExtraDayBody,
  PmpWeeklyGoalParams,
  PmpWeeklyGoalsQuery,
} from '../schemas/pmp-goal.schemas.js';
import { PmpBlockService } from '../services/pmp-block.service.js';
import { PmpGoalService } from '../services/pmp-goal.service.js';
import { PmpRedistributionService } from '../services/pmp-redistribution.service.js';

export async function listPmpBlockWeeksController(
  req: FastifyRequest<{ Params: PmpBlockIdParams }>,
  reply: FastifyReply,
) {
  const service = new PmpGoalService(req.server.prisma);
  const weeks = await service.listWeeks(req.params.id);
  return reply.status(200).send(weeks);
}

export async function listPmpWeeklyGoalsController(
  req: FastifyRequest<{
    Params: PmpBlockIdParams;
    Querystring: PmpWeeklyGoalsQuery;
  }>,
  reply: FastifyReply,
) {
  const service = new PmpGoalService(req.server.prisma);
  const goals = await service.listWeeklyGoals(
    req.params.id,
    req.query.weekStart,
  );
  return reply.status(200).send(goals);
}

export async function getPmpBlockDashboardController(
  req: FastifyRequest<{
    Params: PmpBlockIdParams;
    Querystring: PmpWeeklyGoalsQuery;
  }>,
  reply: FastifyReply,
) {
  const service = new PmpGoalService(req.server.prisma);
  const dashboard = await service.getDashboard(req.params.id, req.query.weekStart);
  return reply.status(200).send(dashboard);
}

export async function getPmpWeeklyGoalController(
  req: FastifyRequest<{ Params: PmpWeeklyGoalParams }>,
  reply: FastifyReply,
) {
  const service = new PmpGoalService(req.server.prisma);
  const goal = await service.getWeeklyGoal(req.params.id, req.params.goalId);
  return reply.status(200).send(goal);
}

export async function openPmpExtraDayController(
  req: FastifyRequest<{ Params: PmpWeeklyGoalParams; Body: OpenPmpExtraDayBody }>,
  reply: FastifyReply,
) {
  const { id, goalId } = req.params;
  await new PmpRedistributionService(req.server.prisma).openExtraDay(
    id,
    goalId,
    req.body?.fromDate,
  );
  const goal = await new PmpGoalService(req.server.prisma).getWeeklyGoal(id, goalId);
  return reply.status(200).send(goal);
}

export async function closePmpExtraDayController(
  req: FastifyRequest<{ Params: PmpWeeklyGoalParams }>,
  reply: FastifyReply,
) {
  const { id, goalId } = req.params;
  await new PmpRedistributionService(req.server.prisma).closeExtraDay(id, goalId);
  const goal = await new PmpGoalService(req.server.prisma).getWeeklyGoal(id, goalId);
  return reply.status(200).send(goal);
}

export async function getPmpWeeklyGoalPartPreviewController(
  req: FastifyRequest<{ Params: PmpWeeklyGoalParams }>,
  reply: FastifyReply,
) {
  const goal = await req.server.prisma.productionWeeklyGoal.findFirst({
    where: { id: req.params.goalId, pmpBlockId: req.params.id },
    select: { productCode: true },
  });
  if (!goal) {
    throw new AppError('Meta semanal não encontrada.', 404);
  }

  const productCode = goal.productCode.trim();
  let part = productCode ? await fetchPartByPartCodeFromBaseApi(productCode) : null;
  if (!part && productCode) {
    part = await fetchPartByPartNumberFromBaseApi(productCode);
  }

  const imageUrl = part ? pickFirstPartImagePublicUrl(part) : null;
  return reply.status(200).send({ imageUrl });
}

export async function listPmpBlocksController(
  req: FastifyRequest,
  reply: FastifyReply,
) {
  const service = new PmpBlockService(req.server.prisma);
  const blocks = await service.listBlocks();
  return reply.status(200).send(blocks);
}

export async function getPmpBlockController(
  req: FastifyRequest<{ Params: PmpBlockIdParams }>,
  reply: FastifyReply,
) {
  const service = new PmpBlockService(req.server.prisma);
  const block = await service.getBlock(req.params.id);
  return reply.status(200).send(block);
}

export async function createPmpBlockController(
  req: FastifyRequest<{ Body: CreatePmpBlockBody }>,
  reply: FastifyReply,
) {
  const service = new PmpBlockService(req.server.prisma);
  const block = await service.createBlock(req.body);
  return reply.status(201).send(block);
}

export async function uploadPmpBlockThemeImageController(
  req: FastifyRequest<{ Params: PmpBlockIdParams }>,
  reply: FastifyReply,
) {
  if (!req.isMultipart()) {
    throw new AppError('Envie a imagem como multipart/form-data.', 400);
  }

  const file = await req.file();
  if (!file) {
    throw new AppError('Selecione uma imagem.', 400);
  }

  if (!isPmpBlockThemeMimeType(file.mimetype)) {
    file.file.resume();
    throw new AppError(
      'Use PNG ou WEBP com fundo transparente (sem JPEG).',
      400,
    );
  }

  const buffer = await file.toBuffer();
  if (file.file.truncated || buffer.length > PMP_BLOCK_THEME_MAX_BYTES) {
    throw new AppError('A imagem deve ter no máximo 15 MB.', 413);
  }
  if (buffer.length === 0) {
    throw new AppError('A imagem enviada está vazia.', 400);
  }

  const service = new PmpBlockService(req.server.prisma);
  const block = await service.replaceThemeImage(req.params.id, {
    buffer,
    mimeType: file.mimetype,
    originalName: file.filename,
  });
  return reply.status(200).send(block);
}

export async function getPmpBlockThemeImageController(
  req: FastifyRequest<{ Params: PmpBlockIdParams }>,
  reply: FastifyReply,
) {
  const service = new PmpBlockService(req.server.prisma);
  const file = await service.getThemeImageFile(req.params.id);

  return reply
    .header('Content-Type', file.mimeType)
    .header('Content-Length', file.size)
    .header('Cache-Control', 'private, max-age=31536000, immutable')
    .send(file.stream);
}

export async function updatePmpBlockController(
  req: FastifyRequest<{
    Params: PmpBlockIdParams;
    Body: UpdatePmpBlockBody;
  }>,
  reply: FastifyReply,
) {
  const service = new PmpBlockService(req.server.prisma);
  const block = await service.updateBlock(req.params.id, req.body);
  return reply.status(200).send(block);
}
