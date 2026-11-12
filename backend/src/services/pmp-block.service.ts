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
  },
  series: {
    orderBy: { name: 'asc' as const },
    include: {
      parts: true,
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
  }>;
  series: Array<{
    id: string;
    name: string;
    parts: Array<{ partCode: string; operation: number }>;
  }>;
};

type SeriesPart = { partCode: string; operation: number };

function sortSeriesParts<T extends SeriesPart>(parts: T[]): T[] {
  return [...parts].sort(
    (a, b) =>
      a.partCode.localeCompare(b.partCode, 'pt-BR', { numeric: true }) ||
      a.operation - b.operation,
  );
}

/** Códigos de peça são gravados sem zeros à esquerda, como no import das metas semanais. */
function normalizeSeries(inputs: PmpSeriesInput[]) {
  const names = new Set<string>();
  return inputs.map((item) => {
    const name = item.name.trim();
    const key = name.toLocaleUpperCase('pt-BR');
    if (names.has(key)) {
      throw new AppError(`Classe "${name}" repetida na lista.`, 400);
    }
    names.add(key);
    const partsByKey = new Map<string, SeriesPart>();
    for (const part of item.parts) {
      const partCode = part.partCode.trim().replace(/^0+/, '');
      if (partCode) {
        partsByKey.set(`${partCode}|${part.operation}`, { partCode, operation: part.operation });
      }
    }
    return { name, parts: sortSeriesParts([...partsByKey.values()]) };
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
    })),
    series: block.series.map((series) => ({
      id: series.id,
      name: series.name,
      parts: sortSeriesParts(
        series.parts.map((part) => ({ partCode: part.partCode, operation: part.operation })),
      ),
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
          })),
        },
        series: {
          create: series.map((item) => ({
            name: item.name,
            parts: {
              create: item.parts,
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
      include: { costCenters: true },
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

    const removedCostCenterIds = block.costCenters
      .filter((cc) => !nextBySectorId.has(cc.sectorIdApi))
      .map((cc) => cc.id);

    await this.prisma.$transaction(async (tx) => {
      if (removedCostCenterIds.length > 0) {
        const removedDailyGoals = {
          weeklyGoal: { pmpCostCenterId: { in: removedCostCenterIds } },
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
          where: { pmpCostCenterId: { in: removedCostCenterIds } },
        });
        await tx.pmpCostCenter.deleteMany({
          where: { id: { in: removedCostCenterIds } },
        });
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
            },
          });
          continue;
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
          if (item.parts.length > 0) {
            await tx.pmpSeriesPart.createMany({
              data: item.parts.map((part) => ({ pmpSeriesId: saved.id, ...part })),
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
