import { getFromBaseApi } from './base-api.js';
import type {
  ExternalOfResponse,
  ExternalProcessResponse,
} from '../types/external-of.types.js';

function encodeOfPathSegment(ofNumber: string): string {
  return encodeURIComponent(ofNumber.trim());
}

/**
 * Cabeçalho da OF na API base (mesmos caminhos usados no projeto Batalha Naval).
 */
export async function fetchOfHeaderFromBaseApi(
  ofNumber: string,
): Promise<ExternalOfResponse | null> {
  const encoded = encodeOfPathSegment(ofNumber);
  const result = await getFromBaseApi<ExternalOfResponse>(`/of/get/${encoded}`, {
    timeout: 15000,
  });
  if (result.status === 404 || !result.data) {
    return null;
  }
  return result.data;
}

/**
 * Lista de processos da OF na API base.
 */
export async function fetchOfProcessesFromBaseApi(
  ofNumber: string,
): Promise<ExternalProcessResponse[]> {
  const encoded = encodeOfPathSegment(ofNumber);
  const result = await getFromBaseApi<ExternalProcessResponse[]>(
    `/of/processes/${encoded}`,
    { timeout: 15000 },
  );
  if (result.status === 404 || result.data == null) {
    return [];
  }
  if (!Array.isArray(result.data)) {
    return [];
  }
  return result.data;
}
