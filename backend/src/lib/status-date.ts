/**
 * Normaliza `STATUS_DATA` da planilha/API (remove pontos/espacos a esquerda, trim, maiusculas).
 */
export function normalizeStatusDate(
  statusDate: string | null | undefined,
): string {
  return (statusDate ?? '').replace(/^[.\s]+/, '').trim().toUpperCase();
}

export function hasStatusDateValue(statusDate: string | null | undefined): boolean {
  return normalizeStatusDate(statusDate).length > 0;
}
