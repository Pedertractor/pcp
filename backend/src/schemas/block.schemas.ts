import z from 'zod';
import { BlockSector } from '../generated/prisma/enums.js';
import { blockLineSchema } from './line.schemas.js';

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
  lineId: z.string().nullable(),
  costCenter: z.string().nullable(),
  positionX: z.number().nullable(),
  positionY: z.number().nullable(),
  positionWidth: z.number().nullable(),
  positionHeight: z.number().nullable(),
  labelAnchor: z.enum([
    'TOP_LEFT',
    'TOP_RIGHT',
    'BOTTOM_LEFT',
    'BOTTOM_RIGHT',
  ]),
  expectedPiecesToday: z.number(),
  /** m²: soma de área da peça * quantidade. */
  expectedAreaToday: z.number(),
  /** Peças apontadas em processos finalizados no dia (consulta de processos). */
  producedPiecesToday: z.number(),
  /** m² produzido: soma (m² por peça × quantidade efetiva do processo). */
  producedAreaToday: z.number(),
});

export const blockDetailSchema = blockSummarySchema.extend({
  blockPlanImage: blockPlanImageSchema.nullable(),
  lines: z.array(blockLineSchema),
  machines: z.array(machineSchema),
  expectedPiecesToday: z.number(),
  expectedAreaToday: z.number(),
  producedPiecesToday: z.number(),
  producedAreaToday: z.number(),
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
