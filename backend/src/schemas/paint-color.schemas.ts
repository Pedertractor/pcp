import z from 'zod';

import { blockIdParamsSchema } from './block.schemas.js';

export const mapHexSchema = z
  .string()
  .regex(/^#[0-9A-Fa-f]{6}$/, 'Use uma cor em formato hexadecimal (#RRGGBB).');

export const blockPaintColorItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  brand: z.string().nullable(),
  mapHex: z.string().nullable(),
});

export type BlockPaintColorItem = z.infer<typeof blockPaintColorItemSchema>;

export const blockPaintColorsListResponseSchema = z.array(
  blockPaintColorItemSchema,
);

export const updateBlockPaintColorBodySchema = z.object({
  mapHex: mapHexSchema,
});

export type UpdateBlockPaintColorBody = z.infer<
  typeof updateBlockPaintColorBodySchema
>;

export const blockPaintColorParamsSchema = blockIdParamsSchema.extend({
  colorId: z.uuid('ID da cor inválido'),
});

export type BlockPaintColorParams = z.infer<typeof blockPaintColorParamsSchema>;
