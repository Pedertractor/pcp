/** Setor retornado por `GET /sector/list` da API base. */
export type BaseApiSector = {
  id: string;
  name: string;
  costCenter: string;
  normalizedName: string;
  status: boolean;
  operationId: number | null;
  leaderDayId: number | null;
  leaderNightId: number | null;
  supervisorDayId: number | null;
  supervisorNightId: number | null;
  managerId: number | null;
  createdAt: string;
  updatedAt: string;
};
