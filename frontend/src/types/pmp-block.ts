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

export type PmpSeriesPart = {
  partCode: string;
  operation: number;
};

export type PmpSeries = {
  id: string;
  name: string;
  parts: PmpSeriesPart[];
};

export type PmpBlockSummary = {
  id: string;
  name: string;
  themeImage: PmpBlockThemeImage | null;
  costCenters: PmpCostCenter[];
  series: PmpSeries[];
  createdAt: string;
  updatedAt: string;
};

export type PmpCostCenterInput = {
  sectorIdApi: string;
  operations: number[];
};

export type PmpSeriesInput = {
  name: string;
  parts: PmpSeriesPart[];
};

export type CreatePmpBlockInput = {
  name: string;
  costCenters: PmpCostCenterInput[];
  series: PmpSeriesInput[];
};

export type UpdatePmpBlockInput = {
  name?: string;
  costCenters: PmpCostCenterInput[];
  series?: PmpSeriesInput[];
};
