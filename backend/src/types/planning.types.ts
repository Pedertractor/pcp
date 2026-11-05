export type PlanningRow = {
  ofNumber: string;
  partCode: string;
  costCenter: string;
  lineCode: string;
  machineCode: string;
  quantity: number;
  colorName: string | null;
  area: string | null;
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
  linesCreated: number;
  machinesCreated: number;
  ordersCreated: number;
  ordersUpdated: number;
  demoPositionsAssigned: number;
};
