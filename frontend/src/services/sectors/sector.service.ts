import { httpClient } from '@/lib/http-client';
import type { SectorOption } from '@/types/sector';

export const sectorsListQueryKey = ['sectors', 'list'] as const;

export async function listSectors(): Promise<SectorOption[]> {
  return httpClient.get<SectorOption[]>('/sectors');
}
