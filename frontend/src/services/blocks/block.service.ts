import { httpClient } from '@/lib/http-client';
import type {
  BlockDetail,
  BlockMachine,
  BlockProductionOrder,
  BlockSummary,
  CreateBlockInput,
} from '@/types/block';

export const blocksListQueryKey = ['blocks', 'list'] as const;

export function blockDetailQueryKey(id: string) {
  return ['blocks', 'detail', id] as const;
}

export type BlockPaintColorRow = {
  id: string;
  name: string;
  brand: string | null;
  mapHex: string | null;
};

export function blockPaintColorsQueryKey(blockId: string) {
  return ['blocks', blockId, 'paint-colors'] as const;
}

export async function listBlocks(): Promise<BlockSummary[]> {
  return httpClient.get<BlockSummary[]>('/blocks');
}

export async function getBlock(id: string): Promise<BlockDetail> {
  return httpClient.get<BlockDetail>(`/blocks/${id}`);
}

export function blockProductionOrdersQueryKey(blockId: string) {
  return ['blocks', blockId, 'production-orders'] as const;
}

export async function listBlockProductionOrders(
  blockId: string,
): Promise<BlockProductionOrder[]> {
  return httpClient.get<BlockProductionOrder[]>(
    `/blocks/${blockId}/production-orders`,
  );
}

export async function listBlockPaintColors(
  blockId: string,
): Promise<BlockPaintColorRow[]> {
  return httpClient.get<BlockPaintColorRow[]>(
    `/blocks/${blockId}/paint-colors`,
  );
}

export async function updateBlockPaintColorMapHex(
  blockId: string,
  colorId: string,
  mapHex: string,
): Promise<BlockPaintColorRow> {
  return httpClient.patch<BlockPaintColorRow, { mapHex: string }>(
    `/blocks/${blockId}/paint-colors/${colorId}`,
    { mapHex },
  );
}

export function blockPlanImageQueryKey(imageId: string) {
  return ['blocks', 'plan-image', imageId] as const;
}

export async function fetchBlockPlanImage(url: string): Promise<Blob> {
  return httpClient.get<Blob>(url, { responseType: 'blob' });
}

export async function uploadBlockPlanImage(
  blockId: string,
  file: File,
): Promise<BlockDetail> {
  const formData = new FormData();
  formData.append('file', file, file.name);
  return httpClient.post<BlockDetail, FormData>(
    `/blocks/${blockId}/plan-image`,
    formData,
  );
}

export async function updateBlockCostCenters(
  blockId: string,
  sectorIds: string[],
): Promise<BlockDetail> {
  return httpClient.put<BlockDetail, { sectorIds: string[] }>(
    `/blocks/${blockId}/cost-centers`,
    { sectorIds },
  );
}

export async function updateMachineMapPosition(
  blockId: string,
  machineId: string,
  position: {
    positionX: number;
    positionY: number;
    positionWidth: number;
    positionHeight: number;
  },
): Promise<BlockMachine> {
  return httpClient.patch<BlockMachine, typeof position>(
    `/blocks/${blockId}/machines/${machineId}/map-position`,
    position,
  );
}

export async function removeMachineMapPosition(
  blockId: string,
  machineId: string,
): Promise<BlockMachine> {
  return httpClient.delete<BlockMachine>(
    `/blocks/${blockId}/machines/${machineId}/map-position`,
  );
}

export async function createBlock(
  input: CreateBlockInput,
): Promise<BlockDetail> {
  return httpClient.post<BlockDetail, CreateBlockInput>('/blocks', input);
}
