import { BaseApiError, getFromBaseApi } from './base-api.js';
import type { BaseApiSector } from '../types/sector.types.js';

export async function listBaseApiSectors(): Promise<BaseApiSector[]> {
  const response = await getFromBaseApi<BaseApiSector[]>('/sector/list', {
    timeout: 8000,
  });

  if (response.status === 404 || !Array.isArray(response.data)) {
    throw new BaseApiError('A API base não retornou a lista de setores.');
  }

  return response.data.map((sector) => ({
    ...sector,
    name: sector.name.replace(/\s+/g, ' ').trim(),
    costCenter: sector.costCenter.trim(),
  }));
}
