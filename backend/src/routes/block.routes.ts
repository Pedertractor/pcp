import type { FastifyInstance } from 'fastify';
import {
  createBlockController,
  getBlockController,
  getBlockPlanImageController,
  listBlocksController,
  updateBlockCostCentersController,
  uploadBlockPlanImageController,
} from '../controllers/block.controller.js';
import {
  blockDetailSchema,
  blockIdParamsSchema,
  createBlockBodySchema,
  listBlocksResponseSchema,
  updateBlockCostCentersBodySchema,
  type BlockIdParams,
  type CreateBlockBody,
  type UpdateBlockCostCentersBody,
} from '../schemas/block.schemas.js';
import { commonErrors, errorSchema } from '../schemas/error.schemas.js';

export function blockRoutes(fastify: FastifyInstance) {
  fastify.get(
    '',
    {
      schema: {
        summary: 'List production blocks',
        tags: ['Block'],
        security: [{ cookieAuth: [] }],
        response: {
          200: listBlocksResponseSchema.describe('List blocks success response'),
          ...commonErrors,
        },
      },
      onRequest: [fastify.authenticate],
    },
    listBlocksController,
  );

  fastify.get<{ Params: BlockIdParams }>(
    '/:id',
    {
      schema: {
        summary: 'Get production block',
        tags: ['Block'],
        security: [{ cookieAuth: [] }],
        params: blockIdParamsSchema,
        response: {
          200: blockDetailSchema.describe('Get block success response'),
          ...commonErrors,
        },
      },
      onRequest: [fastify.authenticate],
    },
    getBlockController,
  );

  fastify.post<{ Body: CreateBlockBody }>(
    '',
    {
      schema: {
        summary: 'Create production block',
        tags: ['Block'],
        security: [{ cookieAuth: [] }],
        body: createBlockBodySchema,
        response: {
          201: blockDetailSchema.describe('Block created'),
          ...commonErrors,
        },
      },
      onRequest: [fastify.authenticate, fastify.csrfProtection],
    },
    createBlockController,
  );

  fastify.put<{ Params: BlockIdParams; Body: UpdateBlockCostCentersBody }>(
    '/:id/cost-centers',
    {
      schema: {
        summary: 'Replace the cost centers linked to the block',
        tags: ['Block'],
        security: [{ cookieAuth: [] }],
        params: blockIdParamsSchema,
        body: updateBlockCostCentersBodySchema,
        response: {
          200: blockDetailSchema.describe('Cost centers updated'),
          ...commonErrors,
        },
      },
      onRequest: [fastify.authenticate, fastify.csrfProtection],
    },
    updateBlockCostCentersController,
  );

  fastify.post<{ Params: BlockIdParams }>(
    '/:id/plan-image',
    {
      schema: {
        summary: 'Upload or replace the block plan image',
        tags: ['Block'],
        security: [{ cookieAuth: [] }],
        consumes: ['multipart/form-data'],
        params: blockIdParamsSchema,
        response: {
          200: blockDetailSchema.describe('Plan image updated'),
          ...commonErrors,
          413: errorSchema.describe('Payload Too Large'),
        },
      },
      onRequest: [fastify.authenticate, fastify.csrfProtection],
    },
    uploadBlockPlanImageController,
  );

  fastify.get<{ Params: BlockIdParams }>(
    '/:id/plan-image',
    {
      schema: {
        summary: 'Get the block plan image file',
        tags: ['Block'],
        security: [{ cookieAuth: [] }],
        params: blockIdParamsSchema,
      },
      onRequest: [fastify.authenticate],
    },
    getBlockPlanImageController,
  );
}
