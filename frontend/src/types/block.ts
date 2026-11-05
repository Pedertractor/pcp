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
  linesCount: number;
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
  expectedPiecesToday: number;
};

export type BlockLine = {
  id: string;
  code: string;
  machines: BlockMachine[];
};

export type BlockDetail = BlockSummary & {
  blockPlanImage: BlockPlanImage | null;
  lines: BlockLine[];
  expectedPiecesToday: number;
};

export type CreateBlockInput = {
  name: string;
  sector: BlockSector;
  sectorIds: string[];
};
