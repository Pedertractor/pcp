import z from 'zod';

export const pmpBlockThemeImageSchema = z.object({
  id: z.string(),
  name: z.string(),
  originalName: z.string().nullable(),
  url: z.string(),
  mimeType: z.string().nullable(),
  size: z.number().nullable(),
  updatedAt: z.string(),
});

export const pmpCostCenterOperationSchema = z.object({
  id: z.string(),
  operation: z.number().int(),
});

export const pmpCostCenterSchema = z.object({
  id: z.string(),
  costCenter: z.string(),
  sectorName: z.string().nullable(),
  sectorIdApi: z.string(),
  operations: z.array(pmpCostCenterOperationSchema),
});

export const pmpBlockSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  themeImage: pmpBlockThemeImageSchema.nullable(),
  costCenters: z.array(pmpCostCenterSchema),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type PmpBlockSummary = z.infer<typeof pmpBlockSummarySchema>;

export const listPmpBlocksResponseSchema = z.array(pmpBlockSummarySchema);

export const pmpBlockIdParamsSchema = z.object({
  id: z.uuid('ID do bloco PMP inválido'),
});

export type PmpBlockIdParams = z.infer<typeof pmpBlockIdParamsSchema>;

const pmpCostCenterInputSchema = z.object({
  sectorIdApi: z.string().trim().min(1),
  operations: z
    .array(z.number().int().positive('Operação deve ser um número positivo'))
    .default([]),
});

export const createPmpBlockBodySchema = z.object({
  name: z.string().trim().min(1, 'Informe o nome do bloco').max(120),
  costCenters: z
    .array(pmpCostCenterInputSchema)
    .min(1, 'Selecione ao menos um centro de custo'),
});

export type CreatePmpBlockBody = z.infer<typeof createPmpBlockBodySchema>;

export const updatePmpBlockBodySchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  costCenters: z.array(pmpCostCenterInputSchema).min(1),
});

export type UpdatePmpBlockBody = z.infer<typeof updatePmpBlockBodySchema>;
