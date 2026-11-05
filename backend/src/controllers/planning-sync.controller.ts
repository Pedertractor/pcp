import type { FastifyReply, FastifyRequest } from 'fastify';

import { parsePlanningXlsBuffer } from '../integrations/planning-xls-parser.js';
import { AppError } from '../lib/errors.js';
import { parseReferenceDate } from '../lib/excel-serial-date.js';
import type { BlockIdParams } from '../schemas/block.schemas.js';
import { planningSyncBodySchema } from '../schemas/planning-sync.schemas.js';
import { ProductionPlanningSyncService } from '../services/production-planning-sync.service.js';

export async function syncBlockPlanningFromXlsController(
  req: FastifyRequest<{ Params: BlockIdParams }>,
  reply: FastifyReply,
) {
  if (!req.isMultipart()) {
    throw new AppError('Envie a planilha como multipart/form-data.', 400);
  }

  let referenceDateRaw = '';
  let costCentersRaw = '';
  let assignDemoPositions = false;
  let fileBuffer: Buffer | null = null;

  for await (const part of req.parts()) {
    if (part.type === 'file') {
      if (part.fieldname === 'file') {
        fileBuffer = await part.toBuffer();
      } else {
        part.file.resume();
      }
      continue;
    }

    const value = part.value;
    if (typeof value !== 'string') {
      continue;
    }

    if (part.fieldname === 'referenceDate') {
      referenceDateRaw = value;
    } else if (part.fieldname === 'costCenters') {
      costCentersRaw = value;
    } else if (part.fieldname === 'assignDemoPositions') {
      assignDemoPositions = value === 'true' || value === '1';
    }
  }

  if (!fileBuffer?.length) {
    throw new AppError('Selecione a planilha (.xls).', 400);
  }

  let costCentersParsed: unknown;
  try {
    costCentersParsed = JSON.parse(costCentersRaw);
  } catch {
    costCentersParsed = costCentersRaw
      .split(/[,;]/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  const body = planningSyncBodySchema.parse({
    referenceDate: referenceDateRaw,
    costCenters: costCentersParsed,
    assignDemoPositions,
  });

  const referenceDate = parseReferenceDate(body.referenceDate);
  const rows = parsePlanningXlsBuffer(fileBuffer, referenceDate);

  const result = await new ProductionPlanningSyncService(
    req.server.prisma,
  ).syncFromRows({
    blockId: req.params.id,
    referenceDate,
    costCenters: body.costCenters,
    rows,
    assignDemoPositions: body.assignDemoPositions,
  });

  return reply.status(200).send(result);
}
