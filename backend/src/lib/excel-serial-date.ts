/** Converte serial de data do Excel em `Date` (UTC). */
export function excelSerialToDate(serial: number): Date {
  const wholeDays = Math.floor(serial);
  const fraction = serial - wholeDays;
  const utcMs = (wholeDays - 25569) * 86_400_000 + Math.round(fraction * 86_400_000);
  return new Date(utcMs);
}

export function parseReferenceDate(value: string): Date {
  const parsed = new Date(`${value}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Data de referência inválida: ${value}`);
  }
  return parsed;
}

export function startOfLocalDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}
