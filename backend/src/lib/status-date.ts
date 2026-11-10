/**
 * Normaliza `STATUS_DATA` da planilha/API (remove pontos/espacos a esquerda, trim, maiusculas).
 */
export function normalizeStatusDate(
  statusDate: string | null | undefined,
): string {
  return (statusDate ?? '')
    .replace(/^[.\s]+/, '')
    .trim()
    .replace(/\s+/g, ' ')
    .toUpperCase();
}

export function hasStatusDateValue(statusDate: string | null | undefined): boolean {
  return normalizeStatusDate(statusDate).length > 0;
}

/** Contagem de planejamento do bloco: apenas HOJE e NO ATRASO. */
export function isPlanningStatusHojeOuNoAtraso(
  statusDate: string | null | undefined,
): boolean {
  const key = normalizeStatusDate(statusDate);
  return key === 'HOJE' || key === 'NO ATRASO';
}
