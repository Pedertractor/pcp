import z from 'zod';

import { lineLabelAnchorSchema, mapPercent } from './map-common.schemas.js';

export { mapPercent } from './map-common.schemas.js';

export const machineMapPositionBodySchema = z.object({
  positionX: mapPercent,
  positionY: mapPercent,
  positionWidth: mapPercent,
  positionHeight: mapPercent,
  labelAnchor: lineLabelAnchorSchema.optional(),
});

export type MachineMapPositionBody = z.infer<typeof machineMapPositionBodySchema>;

export const machineMapPositionParamsSchema = z.object({
  id: z.uuid('ID do bloco inválido'),
  machineId: z.uuid('ID da máquina inválido'),
});

export type MachineMapPositionParams = z.infer<
  typeof machineMapPositionParamsSchema
>;

export const machineMapPositionResponseSchema = z.object({
  id: z.string(),
  code: z.string(),
  positionX: z.number().nullable(),
  positionY: z.number().nullable(),
  positionWidth: z.number().nullable(),
  positionHeight: z.number().nullable(),
  labelAnchor: lineLabelAnchorSchema,
});
