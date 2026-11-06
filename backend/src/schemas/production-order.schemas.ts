import z from 'zod';
import { ProductionOrderStatus } from '../generated/prisma/enums.js';

export const blockProductionOrderItemSchema = z.object({
  id: z.string(),
  ofNumber: z.string(),
  partCode: z.string(),
  machineCode: z.string().nullable(),
  colorName: z.string().nullable(),
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
