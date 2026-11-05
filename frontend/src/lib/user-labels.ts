import type { UserRole } from '@/types/user';
import type { Unit } from '@/types/unit';
import { UNIT_LABELS } from '@/types/unit';

export function roleLabel(role: UserRole): string {
  switch (role) {
    case 'ADMIN':
      return 'Administrador';
    case 'PCP_OPERATOR':
      return 'Operador PCP';
  }
}

export function unitLabel(unit: Unit | string): string {
  return UNIT_LABELS[unit as Unit] ?? unit;
}
