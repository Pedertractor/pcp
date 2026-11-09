import { env } from '../config/env.js';
import { getFromBaseApiFlexible } from './base-api.js';
import type { BasePartDetailResponse } from '../types/external-part.types.js';

function encodePathSegment(value: string): string {
  return encodeURIComponent(value.trim().replace(/\s+/g, ''));
}

/**
 * Origem HTTP da API base (arquivos estáticos ficam em `/uploads/`, na raiz do host,
 * não sob `/api` — ver `api_base_pedertractor` fastifyStatic prefix `/uploads/`).
 */
export function getBaseApiPublicOrigin(): string {
  let base = env.URL_BASE_API.trim().replace(/\/$/, '');
  if (/\/api$/i.test(base)) {
    base = base.slice(0, -4);
  }
  return base;
}

export function publicUrlForBaseUploadsPath(relativePath: string): string {
  const trimmed = relativePath.trim().replace(/\\/g, '/');
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  const origin = getBaseApiPublicOrigin();
  const rel = trimmed.replace(/^\//, '');
  return `${origin}/${rel}`;
}

/**
 * Primeira imagem utilizável (API base expõe arquivos estáticos em /uploads/...).
 */
export function pickFirstPartImagePublicUrl(
  part: BasePartDetailResponse,
): string | null {
  const rows = part.images;
  if (rows && rows.length > 0 && rows[0].path) {
    return publicUrlForBaseUploadsPath(rows[0].path);
  }
  if (part.localPath) {
    return publicUrlForBaseUploadsPath(part.localPath);
  }
  return null;
}

export async function fetchPartByPartNumberFromBaseApi(
  partNumber: string,
): Promise<BasePartDetailResponse | null> {
  const encoded = encodePathSegment(partNumber);
  const result = await getFromBaseApiFlexible<BasePartDetailResponse>(
    `/part/number/${encoded}`,
    { params: { convert: true }, timeout: 90_000 },
  );
  if (result.status !== 200 || !result.data || typeof result.data !== 'object') {
    return null;
  }
  return result.data;
}

export async function fetchPartByPartCodeFromBaseApi(
  partCode: string,
): Promise<BasePartDetailResponse | null> {
  const encoded = encodePathSegment(partCode);
  const result = await getFromBaseApiFlexible<BasePartDetailResponse>(
    `/part/unique/${encoded}`,
    { params: { convert: true }, timeout: 90_000 },
  );
  if (result.status !== 200 || !result.data || typeof result.data !== 'object') {
    return null;
  }
  return result.data;
}
