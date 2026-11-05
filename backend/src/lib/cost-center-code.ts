/** Normaliza centro de custo para comparação (ex.: 2530 → 02530). */
export function normalizeCostCenterCode(value: string | number): string {
  const digits = String(value).replace(/\D/g, '');
  if (!digits) {
    return '';
  }
  return digits.padStart(5, '0');
}

export function costCenterMatches(
  rowCostCenter: string | number,
  allowed: string[],
): boolean {
  const normalized = normalizeCostCenterCode(rowCostCenter);
  const allowedSet = new Set(allowed.map(normalizeCostCenterCode));
  return allowedSet.has(normalized);
}
