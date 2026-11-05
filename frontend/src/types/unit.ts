export const UNITS = ['PEDERTRACTOR', 'TRACTOR'] as const;

export type Unit = (typeof UNITS)[number];

export const UNIT_LABELS: Record<Unit, string> = {
  PEDERTRACTOR: 'Pedertractor',
  TRACTOR: 'Tractor',
};
