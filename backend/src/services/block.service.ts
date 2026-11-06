import { randomUUID } from 'node:crypto';
import type { PrismaClient } from '../generated/prisma/client.js';
import {
  openBlockPlanFile,
  removeBlockPlanFile,
  saveBlockPlanFile,
  type BlockPlanMimeType,
} from '../lib/block-plan-storage.js';
import { AppError } from '../lib/errors.js';
import type {
  BlockDetail,
  BlockSummary,
  CreateBlockBody,
  UpdateBlockCostCentersBody,
} from '../schemas/block.schemas.js';
import { SectorService } from './sector.service.js';

const costCenterSelect = {
  id: true,
  costCenter: true,
  sectorName: true,
  sectorIdBaseApi: true,
} as const;

const blockSummaryInclude = {
  costCenters: { select: costCenterSelect, orderBy: { costCenter: 'asc' } },
  _count: { select: { machines: true, productionOrders: true } },
} as const;

type BlockWithSummary = {
  id: string;
  name: string;
  sector: BlockSummary['sector'];
  createdAt: Date;
  updatedAt: Date;
  costCenters: BlockSummary['costCenters'];
  _count: { machines: number; productionOrders: number };
};

function roundArea(value: number): number {
  return Math.round(value * 1000) / 1000;
}

/** Início do dia civil local e fim exclusivo (para filtros `finishedAt` / `syncDate`). */
function localDayRange(): { start: Date; end: Date } {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

function effectiveProcessQuantity(
  quantityReported: number | null,
  quantity: number,
): number {
  if (quantityReported !== null && quantityReported >= 0) {
    return quantityReported;
  }
  return quantity >= 0 ? quantity : 0;
}

function toBlockSummary(block: BlockWithSummary): BlockSummary {
  return {
    id: block.id,
    name: block.name,
    sector: block.sector,
    costCenters: block.costCenters,
    machinesCount: block._count.machines,
    productionOrdersCount: block._count.productionOrders,
    createdAt: block.createdAt.toISOString(),
    updatedAt: block.updatedAt.toISOString(),
  };
}

export class BlockService {
  constructor(private readonly prisma: PrismaClient) {}

  async listBlocks(): Promise<BlockSummary[]> {
    const blocks = await this.prisma.block.findMany({
      include: blockSummaryInclude,
      orderBy: { name: 'asc' },
    });

    return blocks.map(toBlockSummary);
  }

  async getBlock(id: string): Promise<BlockDetail> {
    const block = await this.prisma.block.findUnique({
      where: { id },
      include: {
        ...blockSummaryInclude,
        blockPlanImage: {
          select: {
            id: true,
            name: true,
            originalName: true,
            url: true,
            mimeType: true,
            size: true,
            updatedAt: true,
          },
        },
        machines: {
          where: { blockId: id },
          orderBy: { code: 'asc' },
          select: {
            id: true,
            code: true,
            costCenter: true,
            positionX: true,
            positionY: true,
            positionWidth: true,
            positionHeight: true,
          },
        },
      },
    });

    if (!block) {
      throw new AppError('Bloco não encontrado', 404);
    }

    const orders = await this.prisma.productionOrder.findMany({
      where: { blockId: id },
      select: { machineId: true, quantity: true, area: true },
    });
    const totalsByMachine = new Map<
      string | null,
      { pieces: number; area: number; producedPieces: number; producedArea: number }
    >();
    let expectedPiecesToday = 0;
    let expectedAreaToday = 0;
    for (const order of orders) {
      const orderArea = (order.area ?? 0) * order.quantity;
      const totals = totalsByMachine.get(order.machineId) ?? {
        pieces: 0,
        area: 0,
        producedPieces: 0,
        producedArea: 0,
      };
      totals.pieces += order.quantity;
      totals.area += orderArea;
      totalsByMachine.set(order.machineId, totals);
      expectedPiecesToday += order.quantity;
      expectedAreaToday += orderArea;
    }

    const { start: dayStart, end: dayEnd } = localDayRange();
    const finishedProcesses = await this.prisma.productionProcess.findMany({
      where: {
        blockId: id,
        finishedAt: { not: null, gte: dayStart, lt: dayEnd },
      },
      select: {
        machineId: true,
        quantity: true,
        quantityReported: true,
        area: true,
        productionOrder: { select: { area: true } },
      },
    });

    let producedPiecesToday = 0;
    let producedAreaToday = 0;
    for (const proc of finishedProcesses) {
      const m2PerPiece =
        proc.area ??
        proc.productionOrder.area ??
        0;
      const qty = effectiveProcessQuantity(
        proc.quantityReported,
        proc.quantity,
      );
      const procArea = m2PerPiece * qty;
      producedPiecesToday += qty;
      producedAreaToday += procArea;
      const key = proc.machineId;
      const mtotals = totalsByMachine.get(key) ?? {
        pieces: 0,
        area: 0,
        producedPieces: 0,
        producedArea: 0,
      };
      mtotals.producedPieces += qty;
      mtotals.producedArea += procArea;
      totalsByMachine.set(key, mtotals);
    }

    return {
      ...toBlockSummary(block),
      blockPlanImage: block.blockPlanImage
        ? {
            ...block.blockPlanImage,
            updatedAt: block.blockPlanImage.updatedAt.toISOString(),
          }
        : null,
      machines: block.machines.map((machine) => ({
        ...machine,
        expectedPiecesToday: totalsByMachine.get(machine.id)?.pieces ?? 0,
        expectedAreaToday: roundArea(totalsByMachine.get(machine.id)?.area ?? 0),
        producedPiecesToday: totalsByMachine.get(machine.id)?.producedPieces ?? 0,
        producedAreaToday: roundArea(
          totalsByMachine.get(machine.id)?.producedArea ?? 0,
        ),
      })),
      expectedPiecesToday,
      expectedAreaToday: roundArea(expectedAreaToday),
      producedPiecesToday,
      producedAreaToday: roundArea(producedAreaToday),
    };
  }

  async createBlock(input: CreateBlockBody): Promise<BlockDetail> {
    const name = input.name.trim();
    const sectorIds = [...new Set(input.sectorIds.map((id) => id.trim()))];

    const existingName = await this.prisma.block.findUnique({
      where: { name },
      select: { id: true },
    });
    if (existingName) {
      throw new AppError('Já existe um bloco com esse nome.', 409);
    }

    const costCenters = await this.resolveNewCostCenters(sectorIds);

    const block = await this.prisma.block.create({
      data: {
        name,
        sector: input.sector,
        costCenters: { create: costCenters },
      },
      select: { id: true },
    });

    return this.getBlock(block.id);
  }

  async updateCostCenters(
    blockId: string,
    input: UpdateBlockCostCentersBody,
  ): Promise<BlockDetail> {
    const sectorIds = [...new Set(input.sectorIds.map((id) => id.trim()))];

    const block = await this.prisma.block.findUnique({
      where: { id: blockId },
      select: { costCenters: { select: { id: true, sectorIdBaseApi: true } } },
    });
    if (!block) {
      throw new AppError('Bloco não encontrado', 404);
    }

    const currentIds = new Set(
      block.costCenters.map((item) => item.sectorIdBaseApi),
    );
    const addedIds = sectorIds.filter((id) => !currentIds.has(id));
    const removed = block.costCenters.filter(
      (item) => !sectorIds.includes(item.sectorIdBaseApi),
    );

    const added =
      addedIds.length > 0 ? await this.resolveNewCostCenters(addedIds) : [];

    await this.prisma.$transaction([
      this.prisma.costCenter.deleteMany({
        where: { id: { in: removed.map((item) => item.id) } },
      }),
      this.prisma.costCenter.createMany({
        data: added.map((item) => ({ ...item, blockId })),
      }),
      this.prisma.block.update({
        where: { id: blockId },
        data: { updatedAt: new Date() },
      }),
    ]);

    return this.getBlock(blockId);
  }

  private async resolveNewCostCenters(sectorIds: string[]) {
    const activeSectors = await new SectorService(
      this.prisma,
    ).listActiveSectors();
    const sectorsById = new Map(activeSectors.map((item) => [item.id, item]));
    const missing = sectorIds.filter((id) => !sectorsById.has(id));
    if (missing.length > 0) {
      throw new AppError(
        'Algum setor selecionado não está ativo na API base. Atualize a lista e tente novamente.',
        400,
      );
    }

    const costCenters = sectorIds.map((id) => {
      const sector = sectorsById.get(id)!;
      return {
        costCenter: sector.costCenter,
        sectorName: sector.name,
        sectorIdBaseApi: sector.id,
      };
    });

    const usedCostCenters = await this.prisma.costCenter.findMany({
      where: {
        OR: [
          { sectorIdBaseApi: { in: sectorIds } },
          { costCenter: { in: costCenters.map((item) => item.costCenter) } },
        ],
      },
      select: { costCenter: true, block: { select: { name: true } } },
    });
    if (usedCostCenters.length > 0) {
      const used = usedCostCenters
        .map((item) => `${item.costCenter} (${item.block.name})`)
        .join(', ');
      throw new AppError(
        `Centro de custo já vinculado a outro bloco: ${used}.`,
        409,
      );
    }

    return costCenters;
  }

  async replacePlanImage(
    blockId: string,
    upload: {
      buffer: Buffer;
      mimeType: BlockPlanMimeType;
      originalName: string;
    },
  ): Promise<BlockDetail> {
    const block = await this.prisma.block.findUnique({
      where: { id: blockId },
      select: { blockPlanImage: { select: { id: true, name: true } } },
    });
    if (!block) {
      throw new AppError('Bloco não encontrado', 404);
    }

    const fileName = await saveBlockPlanFile(upload.buffer, upload.mimeType);
    const imageId = randomUUID();

    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.blockPlanImage.create({
          data: {
            id: imageId,
            name: fileName,
            originalName: upload.originalName.slice(0, 255) || null,
            url: `/blocks/${blockId}/plan-image?v=${imageId}`,
            mimeType: upload.mimeType,
            size: upload.buffer.length,
          },
        });
        await tx.block.update({
          where: { id: blockId },
          data: { blockPlanImageId: imageId },
        });
        if (block.blockPlanImage) {
          await tx.blockPlanImage.delete({
            where: { id: block.blockPlanImage.id },
          });
        }
      });
    } catch (error) {
      await removeBlockPlanFile(fileName);
      throw error;
    }

    if (block.blockPlanImage) {
      await removeBlockPlanFile(block.blockPlanImage.name).catch(() => {});
    }

    return this.getBlock(blockId);
  }

  async updateMachineMapPosition(
    blockId: string,
    machineId: string,
    position: {
      positionX: number;
      positionY: number;
      positionWidth: number;
      positionHeight: number;
    },
  ) {
    const machine = await this.prisma.machine.findFirst({
      where: { id: machineId, blockId },
      select: { id: true, code: true },
    });
    if (!machine) {
      throw new AppError('Máquina não encontrada neste bloco', 404);
    }

    return this.prisma.machine.update({
      where: { id: machineId },
      data: position,
      select: {
        id: true,
        code: true,
        positionX: true,
        positionY: true,
        positionWidth: true,
        positionHeight: true,
      },
    });
  }

  async clearMachineMapPosition(blockId: string, machineId: string) {
    const machine = await this.prisma.machine.findFirst({
      where: { id: machineId, blockId },
      select: { id: true, code: true },
    });
    if (!machine) {
      throw new AppError('Máquina não encontrada neste bloco', 404);
    }

    return this.prisma.machine.update({
      where: { id: machineId },
      data: {
        positionX: null,
        positionY: null,
        positionWidth: null,
        positionHeight: null,
      },
      select: {
        id: true,
        code: true,
        positionX: true,
        positionY: true,
        positionWidth: true,
        positionHeight: true,
      },
    });
  }

  async getPlanImageFile(blockId: string) {
    const block = await this.prisma.block.findUnique({
      where: { id: blockId },
      select: { blockPlanImage: { select: { name: true, mimeType: true } } },
    });
    if (!block?.blockPlanImage) {
      throw new AppError('Planta do bloco não encontrada', 404);
    }

    const file = await openBlockPlanFile(block.blockPlanImage.name);
    if (!file) {
      throw new AppError('Arquivo da planta não encontrado', 404);
    }

    return {
      ...file,
      mimeType: block.blockPlanImage.mimeType ?? 'application/octet-stream',
    };
  }
}
