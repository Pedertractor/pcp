export type PmpBlockWeek = {
  weekStart: string;
  weekEnd: string;
  goalsCount: number;
  plannedQuantity: number;
  producedQuantity: number;
};

export type PmpWeeklyGoalItem = {
  id: string;
  productCode: string;
  productName: string | null;
  costCenter: string;
  sectorName: string | null;
  operation: number;
  weekStart: string;
  weekEnd: string;
  plannedQuantity: number;
  producedQuantity: number;
  daysCount: number;
};

export type PmpDailyGoalOrder = {
  id: string;
  externalOrderId: string;
  operation: number;
  allocatedQuantity: number;
  producedQuantity: number;
};

export type PmpDailyGoal = {
  id: string;
  date: string;
  plannedQuantity: number;
  producedQuantity: number;
  anticipatedQuantity: number;
  deductedQuantity: number;
  orders: PmpDailyGoalOrder[];
};

export type PmpPlannedProduced = {
  plannedQuantity: number;
  producedQuantity: number;
};

export type PmpBlockDashboard = {
  blockId: string;
  blockName: string;
  weekStart: string;
  weekEnd: string;
  goalsCount: number;
  totals: PmpPlannedProduced;
  costCenters: Array<
    PmpPlannedProduced & { costCenter: string; sectorName: string | null; goalsCount: number }
  >;
  days: Array<PmpPlannedProduced & { date: string }>;
};

export type PmpWeeklyGoalDetail = PmpWeeklyGoalItem & {
  blockId: string;
  blockName: string;
  dailyGoals: PmpDailyGoal[];
};
