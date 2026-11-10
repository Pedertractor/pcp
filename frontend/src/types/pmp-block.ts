export const PMP_BLOCK_THEME_ACCEPTED_TYPES = [
  'image/png',
  'image/webp',
] as const;

export const PMP_BLOCK_THEME_MAX_BYTES = 15 * 1024 * 1024;

export type PmpBlockThemeImage = {
  id: string;
  name: string;
  originalName: string | null;
  url: string;
  mimeType: string | null;
  size: number | null;
  updatedAt: string;
};

export type PmpCostCenterOperation = {
  id: string;
  operation: number;
};

export type PmpCostCenter = {
  id: string;
  costCenter: string;
  sectorName: string | null;
  sectorIdApi: string;
  operations: PmpCostCenterOperation[];
};

export type PmpBlockSummary = {
  id: string;
  name: string;
  themeImage: PmpBlockThemeImage | null;
  costCenters: PmpCostCenter[];
  createdAt: string;
  updatedAt: string;
};

export type PmpCostCenterInput = {
  sectorIdApi: string;
  operations: number[];
};

export type CreatePmpBlockInput = {
  name: string;
  costCenters: PmpCostCenterInput[];
};

export type UpdatePmpBlockInput = {
  name?: string;
  costCenters: PmpCostCenterInput[];
};
