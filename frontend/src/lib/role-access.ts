import type { UserRole } from '@/types/user';

export function canAccessUserManagement(role: UserRole | undefined): boolean {
  return role === 'ADMIN';
}

export function assignableUserRolesForActor(
  actorRole: UserRole | undefined,
): UserRole[] {
  if (actorRole === 'ADMIN') {
    return ['PCP_OPERATOR', 'ADMIN'];
  }

  return [];
}
