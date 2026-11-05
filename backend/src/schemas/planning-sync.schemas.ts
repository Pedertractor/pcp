import z from 'zod';

export const planningSyncBodySchema = z.object({
  referenceDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a data no formato AAAA-MM-DD.'),
  costCenters: z
    .array(z.string().trim().min(1).max(10))
    .min(1, 'Informe ao menos um centro de custo.')
    .max(50),
  assignDemoPositions: z.boolean().optional().default(false),
});

export type PlanningSyncBody = z.infer<typeof planningSyncBodySchema>;

export const planningSyncResultSchema = z.object({
  blockId: z.string(),
  referenceDate: z.string(),
  costCenters: z.array(z.string()),
  rowsRead: z.number(),
  rowsMatched: z.number(),
  linesCreated: z.number(),
  machinesCreated: z.number(),
  ordersCreated: z.number(),
  ordersUpdated: z.number(),
  demoPositionsAssigned: z.number(),
});

export type PlanningSyncResultDto = z.infer<typeof planningSyncResultSchema>;
