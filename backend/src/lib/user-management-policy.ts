import type { PrismaClient } from '../generated/prisma/client.js';
import { UserRole } from '../generated/prisma/enums.js';
import { AppError } from './errors.js';
import { APP_USER_ROLES } from './user-roles.js';

export function listRolesVisibleToActor(actorRole: UserRole): UserRole[] {
  if (actorRole === UserRole.ADMIN) {
    return [...APP_USER_ROLES];
  }

  return [];
}

async function loadTargetUser(prisma: PrismaClient, userId: number) {
  const user = await prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
    select: { id: true, role: true },
  });

  if (!user) {
    throw new AppError('Usuário não encontrado', 404);
  }

  return user;
}

export async function assertCanManageExistingUser(
  prisma: PrismaClient,
  actor: { id: number; role: UserRole },
  targetUserId: number,
): Promise<void> {
  if (actor.role !== UserRole.ADMIN) {
    throw new AppError('Acesso negado', 403);
  }

  await loadTargetUser(prisma, targetUserId);
}

export function assertCanCreateUserWithRole(
  actorRole: UserRole,
  role: UserRole,
): void {
  if (actorRole !== UserRole.ADMIN) {
    throw new AppError('Acesso negado', 403);
  }

  if (!APP_USER_ROLES.includes(role as (typeof APP_USER_ROLES)[number])) {
    throw new AppError('Perfil inválido', 400);
  }
}

export function assertCanAssignRole(actorRole: UserRole, role: UserRole): void {
  if (actorRole !== UserRole.ADMIN) {
    throw new AppError('Acesso negado', 403);
  }

  if (!APP_USER_ROLES.includes(role as (typeof APP_USER_ROLES)[number])) {
    throw new AppError('Perfil inválido', 400);
  }
}
