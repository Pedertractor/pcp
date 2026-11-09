import z from 'zod';

import { lineLabelAnchorSchema, mapPercent } from './map-common.schemas.js';

export { lineLabelAnchorSchema, type LineLabelAnchor } from './map-common.schemas.js';

export const blockLineSchema = z.object({
  id: z.string(),
  code: z.string(),
  positionX: z.number().nullable(),
  positionY: z.number().nullable(),
  positionWidth: z.number().nullable(),
  positionHeight: z.number().nullable(),
  labelAnchor: lineLabelAnchorSchema,
  machineIds: z.array(z.string()),
});

export type BlockLine = z.infer<typeof blockLineSchema>;

export const createBlockLineBodySchema = z.object({
  code: z
    .string()
    .trim()
    .min(1, 'Informe o código da linha.')
    .max(40, 'Código muito longo.'),
});

export type CreateBlockLineBody = z.infer<typeof createBlockLineBodySchema>;

export const lineMapPositionBodySchema = z.object({
  positionX: mapPercent,
  positionY: mapPercent,
  positionWidth: mapPercent,
  positionHeight: mapPercent,
  labelAnchor: lineLabelAnchorSchema.optional(),
});

export const updateLineLabelAnchorBodySchema = z.object({
  labelAnchor: lineLabelAnchorSchema,
});

export type UpdateLineLabelAnchorBody = z.infer<
  typeof updateLineLabelAnchorBodySchema
>;

export type LineMapPositionBody = z.infer<typeof lineMapPositionBodySchema>;

export const lineParamsSchema = z.object({
  id: z.uuid('ID do bloco inválido'),
  lineId: z.uuid('ID da linha inválido'),
});

export type LineParams = z.infer<typeof lineParamsSchema>;

export const updateLineMachinesBodySchema = z.object({
  machineIds: z.array(z.uuid('ID da máquina inválido')),
});

export type UpdateLineMachinesBody = z.infer<typeof updateLineMachinesBodySchema>;

export const lineMapPositionResponseSchema = z.object({
  id: z.string(),
  code: z.string(),
  positionX: z.number().nullable(),
  positionY: z.number().nullable(),
  positionWidth: z.number().nullable(),
  positionHeight: z.number().nullable(),
  labelAnchor: lineLabelAnchorSchema,
});
