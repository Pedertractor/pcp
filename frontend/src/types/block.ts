export const BLOCK_SECTORS = ['PAINT'] as const;

export type BlockSector = (typeof BLOCK_SECTORS)[number];

export const BLOCK_SECTOR_LABELS: Record<BlockSector, string> = {
  PAINT: 'Pintura',
};

export type CostCenter = {
  id: string;
  costCenter: string;
  sectorName: string;
  sectorIdBaseApi: string;
};

export type BlockSummary = {
  id: string;
  name: string;
  sector: BlockSector;
  costCenters: CostCenter[];
  machinesCount: number;
  productionOrdersCount: number;
  createdAt: string;
  updatedAt: string;
};

export const BLOCK_PLAN_ACCEPTED_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
] as const;

export const BLOCK_PLAN_MAX_BYTES = 15 * 1024 * 1024;

export type BlockPlanImage = {
  id: string;
  name: string;
  originalName: string | null;
  url: string;
  mimeType: string | null;
  size: number | null;
  updatedAt: string;
};

export type BlockMachine = {
  id: string;
  code: string;
  costCenter: string | null;
  positionX: number | null;
  positionY: number | null;
  positionWidth: number | null;
  positionHeight: number | null;
  expectedPiecesToday: number;
  expectedAreaToday: number;
  /** Peças apontadas em processos com fim no dia atual (consulta de processos). */
  producedPiecesToday: number;
  /** m² produzido no dia (área por peça × quantidade efetiva do processo). */
  producedAreaToday: number;
};

export type BlockDetail = BlockSummary & {
  blockPlanImage: BlockPlanImage | null;
  machines: BlockMachine[];
  expectedPiecesToday: number;
  expectedAreaToday: number;
  producedPiecesToday: number;
  producedAreaToday: number;
};

export type ProductionOrderStatus =
  | 'PENDING'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'OVERDUE';

export const PRODUCTION_ORDER_STATUS_LABELS: Record<
  ProductionOrderStatus,
  string
> = {
  PENDING: 'Pendente',
  IN_PROGRESS: 'Em andamento',
  COMPLETED: 'Concluída',
  OVERDUE: 'Atrasada',
};

export type BlockProductionOrder = {
  id: string;
  ofNumber: string;
  partCode: string;
  machineCode: string | null;
  colorName: string | null;
  operation: string | null;
  costCenter: string | null;
  quantity: number;
  area: number | null;
  totalArea: number;
  statusDate: string | null;
  status: ProductionOrderStatus;
  syncDate: string;
};

export type CreateBlockInput = {
  name: string;
  sector: BlockSector;
  sectorIds: string[];
};
