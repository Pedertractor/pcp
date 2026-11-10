import { httpClient } from '@/lib/http-client';
import type {
  CreatePmpBlockInput,
  PmpBlockSummary,
  UpdatePmpBlockInput,
} from '@/types/pmp-block';

export const pmpBlocksListQueryKey = ['pmp', 'blocks', 'list'] as const;

export function pmpBlockDetailQueryKey(blockId: string) {
  return ['pmp', 'blocks', blockId] as const;
}

export async function listPmpBlocks(): Promise<PmpBlockSummary[]> {
  return httpClient.get<PmpBlockSummary[]>('/pmp/blocks');
}

export async function getPmpBlock(blockId: string): Promise<PmpBlockSummary> {
  return httpClient.get<PmpBlockSummary>(`/pmp/blocks/${blockId}`);
}

export async function createPmpBlock(
  input: CreatePmpBlockInput,
): Promise<PmpBlockSummary> {
  return httpClient.post<PmpBlockSummary, CreatePmpBlockInput>('/pmp/blocks', input);
}

export async function updatePmpBlock(
  blockId: string,
  input: UpdatePmpBlockInput,
): Promise<PmpBlockSummary> {
  return httpClient.put<PmpBlockSummary, UpdatePmpBlockInput>(
    `/pmp/blocks/${blockId}`,
    input,
  );
}

export function pmpBlockThemeImageQueryKey(imageId: string) {
  return ['pmp', 'theme-image', imageId] as const;
}

export async function fetchPmpBlockThemeImage(url: string): Promise<Blob> {
  return httpClient.get<Blob>(url, { responseType: 'blob' });
}

export async function uploadPmpBlockThemeImage(
  blockId: string,
  file: File,
): Promise<PmpBlockSummary> {
  const formData = new FormData();
  formData.append('file', file, file.name);
  return httpClient.post<PmpBlockSummary, FormData>(
    `/pmp/blocks/${blockId}/theme-image`,
    formData,
  );
}
