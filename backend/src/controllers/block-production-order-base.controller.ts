import type { FastifyReply, FastifyRequest } from 'fastify';

import {
  fetchOfHeaderFromBaseApi,
  fetchOfProcessesFromBaseApi,
} from '../integrations/of-base-api.js';
import {
  fetchPartByPartCodeFromBaseApi,
  fetchPartByPartNumberFromBaseApi,
  pickFirstPartImagePublicUrl,
} from '../integrations/part-base-api.js';
import { AppError } from '../lib/errors.js';
import type { ExternalOfResponse } from '../types/external-of.types.js';
import type { BlockProductionOrderParams } from '../schemas/production-order.schemas.js';

async function getOrderOfNumberForBlock(
  prisma: FastifyRequest['server']['prisma'],
  blockId: string,
  orderId: string,
): Promise<string> {
  const order = await prisma.productionOrder.findFirst({
    where: { id: orderId, blockId },
    select: { ofNumber: true },
  });
  if (!order) {
    throw new AppError('OF não encontrada neste bloco.', 404);
  }
  return order.ofNumber;
}

async function getOrderPartCodeForBlock(
  prisma: FastifyRequest['server']['prisma'],
  blockId: string,
  orderId: string,
): Promise<string> {
  const order = await prisma.productionOrder.findFirst({
    where: { id: orderId, blockId },
    select: { partCode: true },
  });
  if (!order) {
    throw new AppError('OF não encontrada neste bloco.', 404);
  }
  return order.partCode;
}

async function enrichOfHeaderWithPartFromBase(
  header: ExternalOfResponse,
  partCodeFallback: string,
) {
  const partNumber = header.partNumber?.trim() ?? '';
  let part =
    partNumber.length > 0
      ? await fetchPartByPartNumberFromBaseApi(partNumber)
      : null;
  if (!part && partCodeFallback.trim().length > 0) {
    part = await fetchPartByPartCodeFromBaseApi(partCodeFallback);
  }

  const description = part?.description?.trim();
  const company = part?.client?.trim();

  return {
    ...header,
    partDescription: description && description.length > 0 ? description : null,
    company: company && company.length > 0 ? company : null,
  };
}

export async function getBlockProductionOrderBaseHeaderController(
  req: FastifyRequest<{ Params: BlockProductionOrderParams }>,
  reply: FastifyReply,
) {
  const { id: blockId, orderId } = req.params;
  const prisma = req.server.prisma;

  const ofNumber = await getOrderOfNumberForBlock(prisma, blockId, orderId);
  const partCode = await getOrderPartCodeForBlock(prisma, blockId, orderId);
  const header = await fetchOfHeaderFromBaseApi(ofNumber);

  if (!header) {
    return reply.status(200).send(null);
  }

  const enriched = await enrichOfHeaderWithPartFromBase(header, partCode);
  return reply.status(200).send(enriched);
}

export async function getBlockProductionOrderBaseProcessesController(
  req: FastifyRequest<{ Params: BlockProductionOrderParams }>,
  reply: FastifyReply,
) {
  const { id: blockId, orderId } = req.params;
  const prisma = req.server.prisma;

  const ofNumber = await getOrderOfNumberForBlock(prisma, blockId, orderId);
  const processes = await fetchOfProcessesFromBaseApi(ofNumber);

  return reply.status(200).send(processes);
}

export async function getBlockProductionOrderBasePartPreviewController(
  req: FastifyRequest<{ Params: BlockProductionOrderParams }>,
  reply: FastifyReply,
) {
  const { id: blockId, orderId } = req.params;
  const prisma = req.server.prisma;

  const ofNumber = await getOrderOfNumberForBlock(prisma, blockId, orderId);
  const partCode = await getOrderPartCodeForBlock(prisma, blockId, orderId);

  const header = await fetchOfHeaderFromBaseApi(ofNumber);
  const partNumberFromHeader = header?.partNumber?.trim() ?? '';

  let part =
    partNumberFromHeader.length > 0
      ? await fetchPartByPartNumberFromBaseApi(partNumberFromHeader)
      : null;
  if (!part && partCode.trim().length > 0) {
    part = await fetchPartByPartCodeFromBaseApi(partCode);
  }

  const imageUrl = part ? pickFirstPartImagePublicUrl(part) : null;

  return reply.status(200).send({ imageUrl });
}
