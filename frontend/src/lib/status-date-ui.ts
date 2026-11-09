/** Ordem dos botões de filtro por STATUS_DATA (planejamento). */
export const STATUS_DATE_FILTER_ORDER: readonly string[] = [
  'NO ATRASO',
  'HOJE',
  'NESTA SEMANA',
  'PRÓXIMA SEMANA',
  'NESTE MÊS',
  'PRÓXIMO MÊS',
  'MESES SEGUINTES',
] as const;

export function normalizeStatusDate(value: string | null | undefined): string {
  return (value ?? '')
    .replace(/^[.\s]+/, '')
    .trim()
    .replace(/\s+/g, ' ')
    .toUpperCase();
}

/** Cor do indicador (bolinha) por STATUS_DATA normalizado. */
export function statusDateDotClass(norm: string): string {
  if (norm === 'all') {
    return 'bg-muted-foreground/45';
  }
  switch (norm) {
    case 'HOJE':
      return 'bg-emerald-500';
    case 'NO ATRASO':
      return 'bg-destructive';
    case 'NESTA SEMANA':
    case 'PRÓXIMA SEMANA':
      return 'bg-amber-500';
    case 'NESTE MÊS':
    case 'PRÓXIMO MÊS':
    case 'MESES SEGUINTES':
      return 'bg-sky-500';
    default:
      return 'bg-muted-foreground';
  }
}

/**
 * Ao escolher um rótulo no filtro, a lista também passa a aceitar estes STATUS_DATA
 * (mesma faixa de planejamento; ex.: NESTE MÊS inclui PRÓXIMA SEMANA).
 */
const STATUS_DATE_FILTER_EXPANSION: Record<string, readonly string[]> = {
  'NESTE MÊS': ['PRÓXIMA SEMANA'],
};

export function expandStatusDateFilterSelection(
  selected: readonly string[],
): Set<string> {
  const expanded = new Set<string>();
  for (const norm of selected) {
    expanded.add(norm);
    const extra = STATUS_DATE_FILTER_EXPANSION[norm];
    if (extra) {
      for (const item of extra) {
        expanded.add(item);
      }
    }
  }
  return expanded;
}

export function statusDateMatchesFilter(
  statusDate: string | null | undefined,
  selected: readonly string[],
): boolean {
  const norm = normalizeStatusDate(statusDate);
  return expandStatusDateFilterSelection(selected).has(norm);
}

export function statusDateBadgeClass(norm: string): string {
  switch (norm) {
    case 'HOJE':
      return 'border-emerald-500/35 bg-emerald-500/12 text-emerald-900 dark:text-emerald-300';
    case 'NO ATRASO':
      return 'border-destructive/35 bg-destructive/10 text-destructive';
    case 'NESTA SEMANA':
    case 'PRÓXIMA SEMANA':
      return 'border-amber-500/35 bg-amber-500/12 text-amber-950 dark:text-amber-200';
    case 'NESTE MÊS':
    case 'PRÓXIMO MÊS':
    case 'MESES SEGUINTES':
      return 'border-sky-500/35 bg-sky-500/12 text-sky-950 dark:text-sky-200';
    default:
      return 'border-border bg-muted text-foreground';
  }
}
