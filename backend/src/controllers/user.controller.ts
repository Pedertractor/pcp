import type { FastifyReply, FastifyRequest } from 'fastify';
import { UserRole } from '../generated/prisma/enums.js';
import type {
  ChangePasswordBody,
  ChangePasswordParams,
  CreateUserBody,
  EmployeeInfoQuery,
  GetUserByEmployeeIdParams,
  LoginBody,
  UpdateUserRoleBody,
  UserIdParams,
} from '../schemas/user.schemas.js';
import { UserService } from '../services/user.service.js';
import { RefreshTokenService } from '../services/refresh-token.service.js';
import {
  clearAuthCookies,
  REFRESH_COOKIE,
  setAuthCookies,
} from '../utils/auth-cookies.js';
import { AppError } from '../lib/errors.js';
import {
  assertCanAssignRole,
  assertCanCreateUserWithRole,
  assertCanManageExistingUser,
  listRolesVisibleToActor,
} from '../lib/user-management-policy.js';
import { infoByCardAndUnit } from '../integrations/employee-by-card-api.js';

async function signAccessToken(
  reply: FastifyReply,
  user: {
    id: number;
    cardNumber: string;
    unit: 'PEDERTRACTOR' | 'TRACTOR';
    employeeId: number;
    role: UserRole;
  },
) {
  return reply.jwtSign({
    id: user.id,
    cardNumber: user.cardNumber,
    unit: user.unit,
    employeeId: user.employeeId,
    role: user.role,
  });
}

export async function getCsrfController(
  _req: FastifyRequest,
  reply: FastifyReply,
) {
  const csrfToken = reply.generateCsrf();
  return reply.status(200).send({ csrfToken });
}

export async function getMyUserController(
  req: FastifyRequest,
  reply: FastifyReply,
) {
  const userService = new UserService(req.server.prisma);
  const user = await userService.getUserById(req.user.id);
  return reply.status(200).send(user);
}

export async function loginController(
  req: FastifyRequest<{ Body: LoginBody }>,
  reply: FastifyReply,
) {
  const userService = new UserService(req.server.prisma);
  const refreshTokenService = new RefreshTokenService(req.server.prisma);
  const { cardNumber, unit, password } = req.body;

  const user = await userService.login(cardNumber, unit, password);
  const { refreshToken } = await refreshTokenService.createSession(user.id);
  const accessToken = await signAccessToken(reply, user);

  setAuthCookies(reply, { accessToken, refreshToken });
  return reply.status(200).send({ user });
}

export async function logoutController(
  req: FastifyRequest,
  reply: FastifyReply,
) {
  const refreshTokenService = new RefreshTokenService(req.server.prisma);
  const rawRefresh = req.cookies[REFRESH_COOKIE];

  if (rawRefresh) {
    await refreshTokenService.revokeFamilyByRawToken(rawRefresh);
  }

  clearAuthCookies(reply);
  return reply.status(204).send();
}

export async function refreshController(
  req: FastifyRequest,
  reply: FastifyReply,
) {
  const rawRefresh = req.cookies[REFRESH_COOKIE];

  if (!rawRefresh) {
    clearAuthCookies(reply);
    throw new AppError('Token inválido ou expirado', 401);
  }

  const userService = new UserService(req.server.prisma);
  const refreshTokenService = new RefreshTokenService(req.server.prisma);

  try {
    const rotated = await refreshTokenService.rotate(rawRefresh);
    const user = await userService.getUserById(rotated.userId);
    const accessToken = await signAccessToken(reply, user);

    setAuthCookies(reply, {
      accessToken,
      refreshToken: rotated.refreshToken,
    });

    return reply.status(200).send({ user });
  } catch (error) {
    clearAuthCookies(reply);
    throw error;
  }
}

export async function changePasswordController(
  req: FastifyRequest<{
    Body: ChangePasswordBody;
    Params: ChangePasswordParams;
  }>,
  reply: FastifyReply,
) {
  const { id } = req.params;

  if (req.user.id !== id) {
    throw new AppError('Acesso negado', 403);
  }

  const userService = new UserService(req.server.prisma);
  const refreshTokenService = new RefreshTokenService(req.server.prisma);
  const user = await userService.changePassword(id, req.body.password);

  await refreshTokenService.revokeAllForUser(id);
  const { refreshToken } = await refreshTokenService.createSession(id);
  const accessToken = await signAccessToken(reply, user);

  setAuthCookies(reply, { accessToken, refreshToken });
  return reply.status(200).send({
    user,
    message: 'Senha alterada com sucesso',
  });
}

export async function listUsersController(
  req: FastifyRequest,
  reply: FastifyReply,
) {
  const userService = new UserService(req.server.prisma);
  const users = await userService.listAllUsers();
  return reply.status(200).send(users);
}

export async function listRolesController(
  req: FastifyRequest,
  reply: FastifyReply,
) {
  return reply.status(200).send(listRolesVisibleToActor(req.user.role));
}

export async function resetUserPasswordController(
  req: FastifyRequest<{ Params: ChangePasswordParams }>,
  reply: FastifyReply,
) {
  const userService = new UserService(req.server.prisma);
  const refreshTokenService = new RefreshTokenService(req.server.prisma);

  await assertCanManageExistingUser(
    req.server.prisma,
    req.user,
    req.params.id,
  );
  await userService.resetPassword(req.params.id);
  await refreshTokenService.revokeAllForUser(req.params.id);

  return reply.status(204).send();
}

export async function createUserController(
  req: FastifyRequest<{ Body: CreateUserBody }>,
  reply: FastifyReply,
) {
  assertCanCreateUserWithRole(req.user.role, req.body.role);
  const userService = new UserService(req.server.prisma);
  const user = await userService.createUser(req.body);
  return reply.status(201).send(user);
}

export async function getEmployeeInfoController(
  req: FastifyRequest<{ Querystring: EmployeeInfoQuery }>,
  reply: FastifyReply,
) {
  const { card, unit } = req.query;
  const employee = await infoByCardAndUnit(unit, card.trim());

  if (!employee) {
    throw new AppError(
      'Colaborador não encontrado para este cartão e unidade.',
      404,
    );
  }

  return reply.status(200).send(employee);
}

export async function inactivateUserController(
  req: FastifyRequest<{ Params: UserIdParams }>,
  reply: FastifyReply,
) {
  if (req.user.id === req.params.id) {
    throw new AppError('Não é possível inativar o próprio usuário', 400);
  }

  await assertCanManageExistingUser(
    req.server.prisma,
    req.user,
    req.params.id,
  );

  const userService = new UserService(req.server.prisma);
  const refreshTokenService = new RefreshTokenService(req.server.prisma);

  await userService.inactivate(req.params.id);
  await refreshTokenService.revokeAllForUser(req.params.id);

  return reply.status(204).send();
}

export async function activateUserController(
  req: FastifyRequest<{ Params: UserIdParams }>,
  reply: FastifyReply,
) {
  await assertCanManageExistingUser(
    req.server.prisma,
    req.user,
    req.params.id,
  );

  const userService = new UserService(req.server.prisma);
  await userService.activate(req.params.id);
  return reply.status(204).send();
}

export async function updateUserRoleController(
  req: FastifyRequest<{
    Body: UpdateUserRoleBody;
    Params: UserIdParams;
  }>,
  reply: FastifyReply,
) {
  assertCanAssignRole(req.user.role, req.body.role);
  await assertCanManageExistingUser(
    req.server.prisma,
    req.user,
    req.params.id,
  );

  const userService = new UserService(req.server.prisma);
  await userService.updateUserRole(req.params.id, req.body.role);
  return reply.status(204).send();
}

export async function getUserByEmployeeIdController(
  req: FastifyRequest<{ Params: GetUserByEmployeeIdParams }>,
  reply: FastifyReply,
) {
  const userService = new UserService(req.server.prisma);
  const user = await userService.getUserByEmployeeId(req.params.employeeId);
  return reply.status(200).send(user);
}
