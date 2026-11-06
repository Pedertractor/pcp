export type PlanningRow = {
  ofNumber: string;
  partCode: string;
  costCenter: string;
  lineCode: string;
  machineCode: string;
  quantity: number;
  colorName: string | null;
  /** m² de uma peça. */
  area: number | null;
  operation: string | null;
  statusDate: string | null;
  targetDate: Date;
};

export type PlanningSyncResult = {
  blockId: string;
  referenceDate: string;
  costCenters: string[];
  rowsRead: number;
  rowsMatched: number;
  rowsSkippedByStatus: number;
  machinesCreated: number;
  ordersCreated: number;
  ordersUpdated: number;
  demoPositionsAssigned: number;
};
