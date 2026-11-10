import z from 'zod';

export const sectorOptionSchema = z.object({
  id: z.string(),
  name: z.string(),
  costCenter: z.string(),
  normalizedName: z.string(),
  operationId: z.number().nullable(),
  linkedBlock: z
    .object({
      id: z.string(),
      name: z.string(),
    })
    .nullable(),
  linkedPmpBlock: z
    .object({
      id: z.string(),
      name: z.string(),
    })
    .nullable(),
});

export type SectorOption = z.infer<typeof sectorOptionSchema>;

export const listSectorsResponseSchema = z.array(sectorOptionSchema);
