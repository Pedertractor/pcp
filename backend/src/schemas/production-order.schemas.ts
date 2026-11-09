import z from 'zod';
import { ProductionOrderStatus } from '../generated/prisma/enums.js';

export const blockProductionOrderItemSchema = z.object({
  id: z.string(),
  ofNumber: z.string(),
  partCode: z.string(),
  machineCode: z.string().nullable(),
  colorName: z.string().nullable(),
  /** Hex do mapa (#RRGGBB) quando a cor está vinculada ao bloco com mapHex. */
  colorMapHex: z.string().nullable(),
  operation: z.string().nullable(),
  costCenter: z.string().nullable(),
  quantity: z.number(),
  /** m² de uma peça. */
  area: z.number().nullable(),
  /** m² da OF: area * quantity. */
  totalArea: z.number(),
  statusDate: z.string().nullable(),
  status: z.enum(ProductionOrderStatus),
  syncDate: z.string(),
});

export type BlockProductionOrderItem = z.infer<
  typeof blockProductionOrderItemSchema
>;

export const blockProductionOrdersListResponseSchema = z.array(
  blockProductionOrderItemSchema,
);

/** Parâmetro para rotas aninhadas bloco → OF (id interno). */
export const blockProductionOrderParamsSchema = z.object({
  id: z.string().uuid(),
  orderId: z.string().uuid(),
});

export type BlockProductionOrderParams = z.infer<
  typeof blockProductionOrderParamsSchema
>;

const externalOfHeaderSchema = z.object({
  ofNumber: z.string(),
  partCode: z.string(),
  partNumber: z.string(),
  date: z.string(),
  quantity: z.number(),
  originalQuantity: z.number(),
  serialNumber: z.number().nullable(),
  observation: z.string(),
});

const externalProcessItemSchema = z.object({
  OF: z.number(),
  OP: z.number(),
  QTD: z.number(),
  QTD_APT: z.number(),
  employeeName: z.string().nullable(),
  employeeCard: z.string().nullable(),
  employeeUnit: z.string().nullable(),
  employeeId: z.number().nullable(),
  costCenter: z.string(),
  nameSector: z.string().nullable(),
});

export const blockProductionOrderBaseHeaderResponseSchema =
  externalOfHeaderSchema
    .extend({
      partDescription: z.string().nullable(),
      company: z.string().nullable(),
    })
    .nullable();

export const blockProductionOrderBaseProcessesResponseSchema = z.array(
  externalProcessItemSchema,
);

export const blockProductionOrderBasePartPreviewResponseSchema = z.object({
  imageUrl: z.union([z.string().url(), z.null()]),
});
