import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import z, { ZodError } from 'zod';
import { AppError } from './errors.js';
import { Prisma } from '../generated/prisma/client.js';
import { env } from '../config/env.js';
import { validationErrorFormatter } from '../utils/validationErrorFormatter.js';
import type { FastifyValidationError } from '../types/error.types.js';

export function errorHandler(
  error: FastifyError,
  request: FastifyRequest,
  reply: FastifyReply,
) {
  if (error instanceof ZodError) {
    return reply.status(400).send({
      message: 'ValidationError',
      errors: z.prettifyError(error),
    });
  }

  if (error instanceof AppError) {
    return reply.status(error.statusCode).send({
      message: error.message,
    });
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      const target = error.meta?.target || 'desconhecido';
      return reply.status(409).send({
        message: `Violação de unicidade no campo ${target}`,
      });
    }

    if (error.code === 'P2025') {
      return reply.status(404).send({
        message: 'Registro não encontrado',
      });
    }
  }

  if (error && typeof error === 'object' && 'validation' in error) {
    const customError = error as unknown as {
      message: string;
    };
    return reply.status(400).send({
      message: customError.message || 'Dados da requisição inválidos',
      errors: validationErrorFormatter(
        error as unknown as FastifyValidationError,
      ),
    });
  }

  if (error && typeof error === 'object' && 'statusCode' in error) {
    const statusError = error as unknown as {
      statusCode: number;
      message: string;
    };
    return reply.status(statusError.statusCode).send({
      message: statusError.message,
    });
  }

  if (env.NODE_ENV === 'development') {
    console.error(error);
  } else {
    request.log.error({ err: error }, 'Unhandled error');
  }

  return reply.status(500).send({
    message: 'Erro interno do servidor',
  });
}
