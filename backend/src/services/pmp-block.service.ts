import { randomUUID } from 'node:crypto';
import type { PrismaClient } from '../generated/prisma/client.js';
import { AppError } from '../lib/errors.js';
import {
  openPmpBlockThemeFile,
  removePmpBlockThemeFile,
  savePmpBlockThemeFile,
  type PmpBlockThemeMimeType,
} from '../lib/pmp-block-theme-storage.js';
import type {
  CreatePmpBlockBody,
  PmpBlockSummary,
  PmpSeriesInput,
  UpdatePmpBlockBody,
} from '../schemas/pmp-block.schemas.js';
import { SectorService } from './sector.service.js';

type PmpCostCenterInput = CreatePmpBlockBody['costCenters'][number];

const pmpBlockInclude = {
  themeImage: true,
  costCenters: {
    orderBy: { costCenter: 'asc' as const },
    include: {
      operations: { orderBy: { operation: 'asc' as const } },
    },
  },
  series: {
    orderBy: { name: 'asc' as const },
    include: {
      parts: { orderBy: { partCode: 'asc' as const } },
    },
  },
} as const;

type PmpBlockWithRelations = {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  themeImage: {
    id: string;
    name: string;
    originalName: string | null;
    url: string;
    mimeType: string | null;
    size: number | null;
    updatedAt: Date;
  } | null;
  costCenters: Array<{
    id: string;
    costCenter: string;
    sectorName: string | null;
    sectorIdApi: string;
    operations: Array<{ id: string; operation: number }>;
  }>;
  series: Array<{
    id: string;
    name: string;
    parts: Array<{ partCode: string }>;
  }>;
};

function dedupeOperations(operations: number[]): number[] {
  return [...new Set(operations)].sort((a, b) => a - b);
}

/** Códigos de peça são gravados sem zeros à esquerda, como no import das metas semanais. */
function normalizeSeries(inputs: PmpSeriesInput[]) {
  const names = new Set<string>();
  return inputs.map((item) => {
    const name = item.name.trim();
    const key = name.toLocaleUpperCase('pt-BR');
    if (names.has(key)) {
      throw new AppError(`Série "${name}" repetida na lista.`, 400);
    }
    names.add(key);
    const partCodes = [
      ...new Set(
        item.partCodes
          .map((code) => code.trim().replace(/^0+/, ''))
          .filter(Boolean),
      ),
    ].sort((a, b) => a.localeCompare(b, 'pt-BR', { numeric: true }));
    return { name, partCodes };
  });
}

function toPmpBlockSummary(block: PmpBlockWithRelations): PmpBlockSummary {
  return {
    id: block.id,
    name: block.name,
    themeImage: block.themeImage
      ? {
          id: block.themeImage.id,
          name: block.themeImage.name,
          originalName: block.themeImage.originalName,
          url: block.themeImage.url,
          mimeType: block.themeImage.mimeType,
          size: block.themeImage.size,
          updatedAt: block.themeImage.updatedAt.toISOString(),
        }
      : null,
    costCenters: block.costCenters.map((cc) => ({
      id: cc.id,
      costCenter: cc.costCenter,
      sectorName: cc.sectorName,
      sectorIdApi: cc.sectorIdApi,
      operations: cc.operations.map((op) => ({
        id: op.id,
        operation: op.operation,
      })),
    })),
    series: block.series.map((series) => ({
      id: series.id,
      name: series.name,
      partCodes: series.parts
        .map((part) => part.partCode)
        .sort((a, b) => a.localeCompare(b, 'pt-BR', { numeric: true })),
    })),
    createdAt: block.createdAt.toISOString(),
    updatedAt: block.updatedAt.toISOString(),
  };
}

export class PmpBlockService {
  constructor(private readonly prisma: PrismaClient) {}

  async listBlocks(): Promise<PmpBlockSummary[]> {
    const blocks = await this.prisma.pmpBlock.findMany({
      include: pmpBlockInclude,
      orderBy: { name: 'asc' },
    });
    return blocks.map(toPmpBlockSummary);
  }

  async getBlock(id: string): Promise<PmpBlockSummary> {
    const block = await this.prisma.pmpBlock.findUnique({
      where: { id },
      include: pmpBlockInclude,
    });
    if (!block) {
      throw new AppError('Bloco PMP não encontrado', 404);
    }
    return toPmpBlockSummary(block);
  }

  async createBlock(input: CreatePmpBlockBody): Promise<PmpBlockSummary> {
    const name = input.name.trim();
    const existingName = await this.prisma.pmpBlock.findUnique({
      where: { name },
      select: { id: true },
    });
    if (existingName) {
      throw new AppError('Já existe um bloco PMP com esse nome.', 409);
    }

    const costCenters = await this.resolveCostCenters(input.costCenters);
    const series = normalizeSeries(input.series);

    const block = await this.prisma.pmpBlock.create({
      data: {
        name,
        costCenters: {
          create: costCenters.map((item) => ({
            costCenter: item.costCenter,
            sectorName: item.sectorName,
            sectorIdApi: item.sectorIdApi,
            operations: {
              create: item.operations.map((operation) => ({ operation })),
            },
          })),
        },
        series: {
          create: series.map((item) => ({
            name: item.name,
            parts: {
              create: item.partCodes.map((partCode) => ({ partCode })),
            },
          })),
        },
      },
      include: pmpBlockInclude,
    });

    return toPmpBlockSummary(block);
  }

  async updateBlock(
    blockId: string,
    input: UpdatePmpBlockBody,
  ): Promise<PmpBlockSummary> {
    const block = await this.prisma.pmpBlock.findUnique({
      where: { id: blockId },
      include: {
        costCenters: {
          include: { operations: true },
        },
      },
    });
    if (!block) {
      throw new AppError('Bloco PMP não encontrado', 404);
    }

    if (input.name && input.name !== block.name) {
      const conflict = await this.prisma.pmpBlock.findUnique({
        where: { name: input.name.trim() },
        select: { id: true },
      });
      if (conflict && conflict.id !== blockId) {
        throw new AppError('Já existe um bloco PMP com esse nome.', 409);
      }
    }

    const resolved = await this.resolveCostCenters(
      input.costCenters,
      blockId,
    );
    const series = input.series ? normalizeSeries(input.series) : null;

    const nextBySectorId = new Map(
      resolved.map((item) => [item.sectorIdApi, item]),
    );
    const currentBySectorId = new Map(
      block.costCenters.map((cc) => [cc.sectorIdApi, cc]),
    );

    const removedOperationIds = block.costCenters.flatMap((cc) => {
      const next = nextBySectorId.get(cc.sectorIdApi);
      if (!next) {
        return cc.operations.map((op) => op.id);
      }
      const nextOps = new Set(next.operations);
      return cc.operations
        .filter((op) => !nextOps.has(op.operation))
        .map((op) => op.id);
    });

    await this.prisma.$transaction(async (tx) => {
      if (removedOperationIds.length > 0) {
        const removedDailyGoals = {
          weeklyGoal: { pmpCostCenterOperationId: { in: removedOperationIds } },
        };
        await tx.productionGoalLoan.deleteMany({
          where: {
            OR: [
              { sourceDailyGoal: removedDailyGoals },
              { targetDailyGoal: removedDailyGoals },
            ],
          },
        });
        await tx.productionWeeklyGoal.deleteMany({
          where: { pmpCostCenterOperationId: { in: removedOperationIds } },
        });
      }

      for (const cc of block.costCenters) {
        if (!nextBySectorId.has(cc.sectorIdApi)) {
          await tx.pmpCostCenter.delete({ where: { id: cc.id } });
        }
      }

      for (const item of resolved) {
        const existing = currentBySectorId.get(item.sectorIdApi);
        if (!existing) {
          await tx.pmpCostCenter.create({
            data: {
              pmpBlockId: blockId,
              costCenter: item.costCenter,
              sectorName: item.sectorName,
              sectorIdApi: item.sectorIdApi,
              operations: {
                create: item.operations.map((operation) => ({ operation })),
              },
            },
          });
          continue;
        }

        const nextOps = new Set(item.operations);
        const toDelete = existing.operations.filter(
          (op) => !nextOps.has(op.operation),
        );
        const currentOps = new Set(existing.operations.map((op) => op.operation));
        const toCreate = item.operations.filter((op) => !currentOps.has(op));

        if (toDelete.length > 0) {
          await tx.pmpCostCenterOperation.deleteMany({
            where: { id: { in: toDelete.map((op) => op.id) } },
          });
        }
        if (toCreate.length > 0) {
          await tx.pmpCostCenterOperation.createMany({
            data: toCreate.map((operation) => ({
              pmpCostCenterId: existing.id,
              operation,
            })),
          });
        }

        await tx.pmpCostCenter.update({
          where: { id: existing.id },
          data: {
            costCenter: item.costCenter,
            sectorName: item.sectorName,
          },
        });
      }

      if (series) {
        await tx.pmpSeries.deleteMany({
          where: {
            pmpBlockId: blockId,
            name: { notIn: series.map((item) => item.name) },
          },
        });
        for (const item of series) {
          const saved = await tx.pmpSeries.upsert({
            where: { pmpBlockId_name: { pmpBlockId: blockId, name: item.name } },
            create: { pmpBlockId: blockId, name: item.name },
            update: {},
            select: { id: true },
          });
          await tx.pmpSeriesPart.deleteMany({ where: { pmpSeriesId: saved.id } });
          if (item.partCodes.length > 0) {
            await tx.pmpSeriesPart.createMany({
              data: item.partCodes.map((partCode) => ({
                pmpSeriesId: saved.id,
                partCode,
              })),
            });
          }
        }
      }

      await tx.pmpBlock.update({
        where: { id: blockId },
        data: {
          ...(input.name ? { name: input.name.trim() } : {}),
          updatedAt: new Date(),
        },
      });
    }, { timeout: 60_000 });

    return this.getBlock(blockId);
  }

  private async resolveCostCenters(
    inputs: PmpCostCenterInput[],
    excludeBlockId?: string,
  ) {
    const sectorIds = [...new Set(inputs.map((item) => item.sectorIdApi.trim()))];
    if (sectorIds.length !== inputs.length) {
      throw new AppError('Centro de custo duplicado na lista.', 400);
    }

    const sectorService = new SectorService(this.prisma);
    const activeSectors = await sectorService.listActiveSectors();
    const sectorsById = new Map(activeSectors.map((item) => [item.id, item]));
    const missing = sectorIds.filter((id) => !sectorsById.has(id));
    if (missing.length > 0) {
      throw new AppError(
        'Algum setor selecionado não está ativo na API base. Atualize a lista e tente novamente.',
        400,
      );
    }

    const used = await this.prisma.pmpCostCenter.findMany({
      where: {
        sectorIdApi: { in: sectorIds },
        ...(excludeBlockId ? { pmpBlockId: { not: excludeBlockId } } : {}),
      },
      select: {
        costCenter: true,
        pmpBlock: { select: { name: true } },
      },
    });
    if (used.length > 0) {
      const labels = used
        .map((item) => `${item.costCenter} (${item.pmpBlock.name})`)
        .join(', ');
      throw new AppError(
        `Centro de custo já vinculado a outro bloco PMP: ${labels}.`,
        409,
      );
    }

    return inputs.map((item) => {
      const sector = sectorsById.get(item.sectorIdApi)!;
      return {
        sectorIdApi: sector.id,
        costCenter: sector.costCenter,
        sectorName: sector.name,
        operations: dedupeOperations(item.operations),
      };
    });
  }

  async replaceThemeImage(
    blockId: string,
    upload: {
      buffer: Buffer;
      mimeType: PmpBlockThemeMimeType;
      originalName: string;
    },
  ): Promise<PmpBlockSummary> {
    const block = await this.prisma.pmpBlock.findUnique({
      where: { id: blockId },
      select: { themeImage: { select: { id: true, name: true } } },
    });
    if (!block) {
      throw new AppError('Bloco PMP não encontrado', 404);
    }

    const fileName = await savePmpBlockThemeFile(upload.buffer, upload.mimeType);
    const imageId = randomUUID();

    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.pmpBlockThemeImage.create({
          data: {
            id: imageId,
            name: fileName,
            originalName: upload.originalName.slice(0, 255) || null,
            url: `/pmp/blocks/${blockId}/theme-image?v=${imageId}`,
            mimeType: upload.mimeType,
            size: upload.buffer.length,
          },
        });
        await tx.pmpBlock.update({
          where: { id: blockId },
          data: { themeImageId: imageId },
        });
        if (block.themeImage) {
          await tx.pmpBlockThemeImage.delete({
            where: { id: block.themeImage.id },
          });
        }
      });
    } catch (error) {
      await removePmpBlockThemeFile(fileName);
      throw error;
    }

    if (block.themeImage) {
      await removePmpBlockThemeFile(block.themeImage.name).catch(() => {});
    }

    return this.getBlock(blockId);
  }

  async getThemeImageFile(blockId: string) {
    const block = await this.prisma.pmpBlock.findUnique({
      where: { id: blockId },
      select: { themeImage: { select: { name: true, mimeType: true } } },
    });
    if (!block?.themeImage) {
      throw new AppError('Imagem temática não encontrada', 404);
    }

    const file = await openPmpBlockThemeFile(block.themeImage.name);
    if (!file) {
      throw new AppError('Arquivo da imagem temática não encontrado', 404);
    }

    return {
      stream: file.stream,
      size: file.size,
      mimeType: block.themeImage.mimeType ?? 'application/octet-stream',
    };
  }
}
