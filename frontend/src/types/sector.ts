export type SectorOption = {
  id: string;
  name: string;
  costCenter: string;
  normalizedName: string;
  operationId: number | null;
  linkedBlock: { id: string; name: string } | null;
  linkedPmpBlock: { id: string; name: string } | null;
};
