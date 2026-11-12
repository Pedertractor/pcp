import z from 'zod';

const dateKeySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data deve estar no formato AAAA-MM-DD');

export const pmpBlockWeekSchema = z.object({
  weekStart: z.string(),
  weekEnd: z.string(),
  goalsCount: z.number(),
  plannedQuantity: z.number(),
  producedQuantity: z.number(),
});

export const listPmpBlockWeeksResponseSchema = z.array(pmpBlockWeekSchema);

export const pmpWeeklyGoalItemSchema = z.object({
  id: z.string(),
  productCode: z.string(),
  productName: z.string().nullable(),
  costCenter: z.string(),
  sectorName: z.string().nullable(),
  operation: z.number(),
  weekStart: z.string(),
  weekEnd: z.string(),
  plannedQuantity: z.number(),
  producedQuantity: z.number(),
  daysCount: z.number(),
});

export const listPmpWeeklyGoalsResponseSchema = z.array(pmpWeeklyGoalItemSchema);

export const pmpDailyGoalOrderSchema = z.object({
  id: z.string(),
  externalOrderId: z.string(),
  operation: z.number(),
  allocatedQuantity: z.number(),
  producedQuantity: z.number(),
});

export const pmpDailyGoalSchema = z.object({
  id: z.string(),
  date: z.string(),
  plannedQuantity: z.number(),
  producedQuantity: z.number(),
  /** Peças antecipadas a partir deste dia (excedente emprestado ao último dia). */
  anticipatedQuantity: z.number(),
  /** Peças abatidas da meta deste dia por antecipações de outros dias. */
  deductedQuantity: z.number(),
  orders: z.array(pmpDailyGoalOrderSchema),
});

export const pmpWeeklyGoalDetailSchema = pmpWeeklyGoalItemSchema.extend({
  blockId: z.string(),
  blockName: z.string(),
  dailyGoals: z.array(pmpDailyGoalSchema),
});

export const pmpWeeklyGoalsQuerySchema = z.object({
  weekStart: dateKeySchema,
});

export type PmpWeeklyGoalsQuery = z.infer<typeof pmpWeeklyGoalsQuerySchema>;

export const pmpWeeklyGoalParamsSchema = z.object({
  id: z.uuid('ID do bloco PMP inválido'),
  goalId: z.uuid('ID da meta semanal inválido'),
});

export type PmpWeeklyGoalParams = z.infer<typeof pmpWeeklyGoalParamsSchema>;

export const openPmpExtraDayBodySchema = z.object({
  /** Dia base da redistribuição até o sábado (padrão: hoje). */
  fromDate: dateKeySchema.optional(),
});

export type OpenPmpExtraDayBody = z.infer<typeof openPmpExtraDayBodySchema>;

const plannedProducedSchema = z.object({
  plannedQuantity: z.number(),
  producedQuantity: z.number(),
});

export const pmpBlockDashboardSchema = z.object({
  blockId: z.string(),
  blockName: z.string(),
  weekStart: z.string(),
  weekEnd: z.string(),
  goalsCount: z.number(),
  totals: plannedProducedSchema,
  costCenters: z.array(
    plannedProducedSchema.extend({
      costCenter: z.string(),
      sectorName: z.string().nullable(),
      goalsCount: z.number(),
    }),
  ),
  days: z.array(plannedProducedSchema.extend({ date: z.string() })),
});

export type PmpBlockDashboard = z.infer<typeof pmpBlockDashboardSchema>;
export type PmpBlockWeek = z.infer<typeof pmpBlockWeekSchema>;
export type PmpWeeklyGoalItem = z.infer<typeof pmpWeeklyGoalItemSchema>;
export type PmpWeeklyGoalDetail = z.infer<typeof pmpWeeklyGoalDetailSchema>;
