import z from 'zod';
import { BlockSector } from '../generated/prisma/enums.js';

export const costCenterSchema = z.object({
  id: z.string(),
  costCenter: z.string(),
  sectorName: z.string(),
  sectorIdBaseApi: z.string(),
});

export const blockPlanImageSchema = z.object({
  id: z.string(),
  name: z.string(),
  originalName: z.string().nullable(),
  url: z.string(),
  mimeType: z.string().nullable(),
  size: z.number().nullable(),
  updatedAt: z.string(),
});

export const blockSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  sector: z.enum(BlockSector),
  costCenters: z.array(costCenterSchema),
  linesCount: z.number(),
  machinesCount: z.number(),
  productionOrdersCount: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type BlockSummary = z.infer<typeof blockSummarySchema>;

export const listBlocksResponseSchema = z.array(blockSummarySchema);

const machineSchema = z.object({
  id: z.string(),
  code: z.string(),
  costCenter: z.string().nullable(),
  positionX: z.number().nullable(),
  positionY: z.number().nullable(),
  expectedPiecesToday: z.number(),
});

const lineSchema = z.object({
  id: z.string(),
  code: z.string(),
  machines: z.array(machineSchema),
});

export const blockDetailSchema = blockSummarySchema.extend({
  blockPlanImage: blockPlanImageSchema.nullable(),
  lines: z.array(lineSchema),
  expectedPiecesToday: z.number(),
});

export type BlockDetail = z.infer<typeof blockDetailSchema>;

export const blockIdParamsSchema = z.object({
  id: z.uuid('ID do bloco inválido'),
});

export type BlockIdParams = z.infer<typeof blockIdParamsSchema>;

const sectorIdsSchema = z
  .array(z.string().trim().min(1).max(40))
  .min(1, 'Selecione pelo menos um centro de custo.')
  .max(100);

export const createBlockBodySchema = z.object({
  name: z.string().trim().min(1, 'Informe o nome do bloco.').max(80),
  sector: z.enum(BlockSector).default(BlockSector.PAINT),
  sectorIds: sectorIdsSchema,
});

export type CreateBlockBody = z.infer<typeof createBlockBodySchema>;

export const updateBlockCostCentersBodySchema = z.object({
  sectorIds: sectorIdsSchema,
});

export type UpdateBlockCostCentersBody = z.infer<
  typeof updateBlockCostCentersBodySchema
>;
