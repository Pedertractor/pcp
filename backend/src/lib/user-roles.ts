import { UserRole } from '../generated/prisma/enums.js';

export const APP_USER_ROLES = [UserRole.ADMIN, UserRole.PCP_OPERATOR] as const;

/** Gestão de usuários (tela /usuarios). */
export const USER_ADMINISTRATION_ROLES = [UserRole.ADMIN] as const;
