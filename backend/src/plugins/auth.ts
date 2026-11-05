import { env } from '../config/env.js';
import fp from 'fastify-plugin';
import fastifyJwt from '@fastify/jwt';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { UserService } from '../services/user.service.js';
import { AppError } from '../lib/errors.js';
import { UserRole } from '../generated/prisma/enums.js';

interface UserPayload {
  id: number;
  cardNumber: string;
  unit: 'PEDERTRACTOR' | 'TRACTOR';
  employeeId: number;
  role: UserRole;
  iat: number;
  exp: number;
}

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (
      request: FastifyRequest,
      reply: FastifyReply,
    ) => Promise<void>;
    authorize: (
      ...allowedRoles: UserRole[]
    ) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: Omit<UserPayload, 'iat' | 'exp'>;
    user: UserPayload;
  }
}

function isFirstLoginAllowedRoute(request: FastifyRequest): boolean {
  const path = request.url.split('?')[0] ?? '';
  const method = request.method;

  if (method === 'GET' && path.endsWith('/users/me')) {
    return true;
  }

  if (method === 'POST' && path.endsWith('/users/logout')) {
    return true;
  }

  if (method === 'PATCH' && /\/users\/\d+\/password$/.test(path)) {
    return true;
  }

  return false;
}

export const authPlugin = fp(async (app) => {
  app.register(fastifyJwt, {
    secret: env.JWT_SECRET,
    sign: {
      expiresIn: env.ACCESS_TOKEN_TTL,
    },
    verify: {
      onlyCookie: true,
    },
    cookie: {
      cookieName: 'access_token',
      signed: false,
    },
  });

  app.decorate(
    'authenticate',
    async (request: FastifyRequest, _reply: FastifyReply) => {
      try {
        await request.jwtVerify();
      } catch {
        throw new AppError('Token inválido ou expirado', 401);
      }

      const userService = new UserService(request.server.prisma);
      const user = await userService.findById(request.user.id);

      if (!user || !user.status) {
        throw new AppError('Token inválido ou expirado', 401);
      }

      request.user = {
        id: user.id,
        cardNumber: user.cardNumber,
        unit: user.unit,
        employeeId: user.employeeId,
        role: user.role,
        iat: request.user.iat,
        exp: request.user.exp,
      };

      if (user.firstLogin && !isFirstLoginAllowedRoute(request)) {
        throw new AppError('Troca de senha obrigatória', 403);
      }
    },
  );

  app.decorate('authorize', (...allowedRoles: UserRole[]) => {
    return async (request: FastifyRequest, _reply: FastifyReply) => {
      const { role } = request.user;

      if (!allowedRoles.includes(role) && role !== UserRole.ADMIN) {
        throw new AppError('Acesso negado', 403);
      }
    };
  });
});
