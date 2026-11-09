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
  listBlockPaintColorsController,
  updateBlockPaintColorController,
} from '../controllers/paint-color.controller.js';
import { syncBlockPlanningFromXlsController } from '../controllers/planning-sync.controller.js';
import {
  getBlockProductionOrderBaseHeaderController,
  getBlockProductionOrderBasePartPreviewController,
  getBlockProductionOrderBaseProcessesController,
} from '../controllers/block-production-order-base.controller.js';
import { listBlockProductionOrdersController } from '../controllers/production-order.controller.js';
import {
  createBlockLineController,
  deleteBlockLineController,
  clearLineMapPositionController,
  updateLineLabelAnchorController,
  updateLineMachinesController,
  updateLineMapPositionController,
} from '../controllers/block-line.controller.js';
import {
  clearMachineMapPositionController,
  updateMachineMapPositionController,
} from '../controllers/machine-map.controller.js';
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
import { planningSyncResultSchema } from '../schemas/planning-sync.schemas.js';
import {
  blockProductionOrderBaseHeaderResponseSchema,
  blockProductionOrderBasePartPreviewResponseSchema,
  blockProductionOrderBaseProcessesResponseSchema,
  blockProductionOrderParamsSchema,
  blockProductionOrdersListResponseSchema,
  type BlockProductionOrderParams,
} from '../schemas/production-order.schemas.js';
import {
  blockPaintColorItemSchema,
  blockPaintColorParamsSchema,
  blockPaintColorsListResponseSchema,
  updateBlockPaintColorBodySchema,
  type BlockPaintColorParams,
  type UpdateBlockPaintColorBody,
} from '../schemas/paint-color.schemas.js';
import {
  createBlockLineBodySchema,
  lineMapPositionBodySchema,
  lineMapPositionResponseSchema,
  lineParamsSchema,
  updateLineLabelAnchorBodySchema,
  updateLineMachinesBodySchema,
  type CreateBlockLineBody,
  type LineMapPositionBody,
  type LineParams,
  type UpdateLineLabelAnchorBody,
  type UpdateLineMachinesBody,
} from '../schemas/line.schemas.js';
import {
  machineMapPositionBodySchema,
  machineMapPositionParamsSchema,
  machineMapPositionResponseSchema,
  type MachineMapPositionBody,
  type MachineMapPositionParams,
} from '../schemas/machine-map.schemas.js';
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

  fastify.post<{ Params: BlockIdParams }>(
    '/:id/planning-sync',
    {
      schema: {
        summary: 'Import planning rows from XLS (simulates base API)',
        tags: ['Block'],
        security: [{ cookieAuth: [] }],
        consumes: ['multipart/form-data'],
        params: blockIdParamsSchema,
        response: {
          200: planningSyncResultSchema.describe('Planning sync result'),
          ...commonErrors,
          413: errorSchema.describe('Payload Too Large'),
        },
      },
      onRequest: [fastify.authenticate, fastify.csrfProtection],
    },
    syncBlockPlanningFromXlsController,
  );

  fastify.get<{ Params: BlockIdParams }>(
    '/:id/production-orders',
    {
      schema: {
        summary: 'List production orders of the block with their sync dates',
        tags: ['Block'],
        security: [{ cookieAuth: [] }],
        params: blockIdParamsSchema,
        response: {
          200: blockProductionOrdersListResponseSchema.describe(
            'Production orders for block',
          ),
          ...commonErrors,
        },
      },
      onRequest: [fastify.authenticate],
    },
    listBlockProductionOrdersController,
  );

  fastify.get<{ Params: BlockProductionOrderParams }>(
    '/:id/production-orders/:orderId/base/of-header',
    {
      schema: {
        summary:
          'Get OF header from base API for a production order in this block',
        tags: ['Block'],
        security: [{ cookieAuth: [] }],
        params: blockProductionOrderParamsSchema,
        response: {
          200: blockProductionOrderBaseHeaderResponseSchema.describe(
            'OF header from base API or null',
          ),
          ...commonErrors,
        },
      },
      onRequest: [fastify.authenticate],
    },
    getBlockProductionOrderBaseHeaderController,
  );

  fastify.get<{ Params: BlockProductionOrderParams }>(
    '/:id/production-orders/:orderId/base/processes',
    {
      schema: {
        summary:
          'List manufacturing processes from base API for a production order',
        tags: ['Block'],
        security: [{ cookieAuth: [] }],
        params: blockProductionOrderParamsSchema,
        response: {
          200: blockProductionOrderBaseProcessesResponseSchema.describe(
            'Processes from base API',
          ),
          ...commonErrors,
        },
      },
      onRequest: [fastify.authenticate],
    },
    getBlockProductionOrderBaseProcessesController,
  );

  fastify.get<{ Params: BlockProductionOrderParams }>(
    '/:id/production-orders/:orderId/base/part-preview',
    {
      schema: {
        summary:
          'Public URL of first part image from base API (by part number or code)',
        tags: ['Block'],
        security: [{ cookieAuth: [] }],
        params: blockProductionOrderParamsSchema,
        response: {
          200: blockProductionOrderBasePartPreviewResponseSchema.describe(
            'Image URL or null',
          ),
          ...commonErrors,
        },
      },
      onRequest: [fastify.authenticate],
    },
    getBlockProductionOrderBasePartPreviewController,
  );

  fastify.patch<{ Params: MachineMapPositionParams; Body: MachineMapPositionBody }>(
    '/:id/machines/:machineId/map-position',
    {
      schema: {
        summary: 'Save machine position on the block plan',
        tags: ['Block'],
        security: [{ cookieAuth: [] }],
        params: machineMapPositionParamsSchema,
        body: machineMapPositionBodySchema,
        response: {
          200: machineMapPositionResponseSchema,
          ...commonErrors,
        },
      },
      onRequest: [fastify.authenticate, fastify.csrfProtection],
    },
    updateMachineMapPositionController,
  );

  fastify.delete<{ Params: MachineMapPositionParams }>(
    '/:id/machines/:machineId/map-position',
    {
      schema: {
        summary: 'Remove machine from the block plan map',
        tags: ['Block'],
        security: [{ cookieAuth: [] }],
        params: machineMapPositionParamsSchema,
        response: {
          200: machineMapPositionResponseSchema,
          ...commonErrors,
        },
      },
      onRequest: [fastify.authenticate, fastify.csrfProtection],
    },
    clearMachineMapPositionController,
  );

  fastify.post<{ Params: BlockIdParams; Body: CreateBlockLineBody }>(
    '/:id/lines',
    {
      schema: {
        summary: 'Create a production line in the block',
        tags: ['Block'],
        security: [{ cookieAuth: [] }],
        params: blockIdParamsSchema,
        body: createBlockLineBodySchema,
        response: {
          201: blockDetailSchema,
          ...commonErrors,
        },
      },
      onRequest: [fastify.authenticate, fastify.csrfProtection],
    },
    createBlockLineController,
  );

  fastify.delete<{ Params: LineParams }>(
    '/:id/lines/:lineId',
    {
      schema: {
        summary: 'Delete a production line from the block',
        tags: ['Block'],
        security: [{ cookieAuth: [] }],
        params: lineParamsSchema,
        response: {
          200: blockDetailSchema,
          ...commonErrors,
        },
      },
      onRequest: [fastify.authenticate, fastify.csrfProtection],
    },
    deleteBlockLineController,
  );

  fastify.patch<{ Params: LineParams; Body: UpdateLineMachinesBody }>(
    '/:id/lines/:lineId/machines',
    {
      schema: {
        summary: 'Assign machines to a line',
        tags: ['Block'],
        security: [{ cookieAuth: [] }],
        params: lineParamsSchema,
        body: updateLineMachinesBodySchema,
        response: {
          200: blockDetailSchema,
          ...commonErrors,
        },
      },
      onRequest: [fastify.authenticate, fastify.csrfProtection],
    },
    updateLineMachinesController,
  );

  fastify.patch<{ Params: LineParams; Body: UpdateLineLabelAnchorBody }>(
    '/:id/lines/:lineId/label-anchor',
    {
      schema: {
        summary: 'Set line name badge corner on the block plan',
        tags: ['Block'],
        security: [{ cookieAuth: [] }],
        params: lineParamsSchema,
        body: updateLineLabelAnchorBodySchema,
        response: {
          200: blockDetailSchema,
          ...commonErrors,
        },
      },
      onRequest: [fastify.authenticate, fastify.csrfProtection],
    },
    updateLineLabelAnchorController,
  );

  fastify.patch<{ Params: LineParams; Body: LineMapPositionBody }>(
    '/:id/lines/:lineId/map-position',
    {
      schema: {
        summary: 'Save line area on the block plan',
        tags: ['Block'],
        security: [{ cookieAuth: [] }],
        params: lineParamsSchema,
        body: lineMapPositionBodySchema,
        response: {
          200: lineMapPositionResponseSchema,
          ...commonErrors,
        },
      },
      onRequest: [fastify.authenticate, fastify.csrfProtection],
    },
    updateLineMapPositionController,
  );

  fastify.delete<{ Params: LineParams }>(
    '/:id/lines/:lineId/map-position',
    {
      schema: {
        summary: 'Remove line from the block plan map',
        tags: ['Block'],
        security: [{ cookieAuth: [] }],
        params: lineParamsSchema,
        response: {
          200: lineMapPositionResponseSchema,
          ...commonErrors,
        },
      },
      onRequest: [fastify.authenticate, fastify.csrfProtection],
    },
    clearLineMapPositionController,
  );

  fastify.get<{ Params: BlockIdParams }>(
    '/:id/paint-colors',
    {
      schema: {
        summary: 'List paint colors used by the block with optional map hex',
        tags: ['Block'],
        security: [{ cookieAuth: [] }],
        params: blockIdParamsSchema,
        response: {
          200: blockPaintColorsListResponseSchema.describe(
            'Paint colors for block',
          ),
          ...commonErrors,
        },
      },
      onRequest: [fastify.authenticate],
    },
    listBlockPaintColorsController,
  );

  fastify.patch<{ Params: BlockPaintColorParams; Body: UpdateBlockPaintColorBody }>(
    '/:id/paint-colors/:colorId',
    {
      schema: {
        summary: 'Set the map display color (hex) for a paint color in this block',
        tags: ['Block'],
        security: [{ cookieAuth: [] }],
        params: blockPaintColorParamsSchema,
        body: updateBlockPaintColorBodySchema,
        response: {
          200: blockPaintColorItemSchema.describe('Updated paint color link'),
          ...commonErrors,
        },
      },
      onRequest: [fastify.authenticate, fastify.csrfProtection],
    },
    updateBlockPaintColorController,
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
