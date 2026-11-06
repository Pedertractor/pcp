import type { PrismaClient } from '../generated/prisma/client.js';
import { AppError } from '../lib/errors.js';
import type { BlockPaintColorItem } from '../schemas/paint-color.schemas.js';

export class PaintColorService {
  constructor(private readonly prisma: PrismaClient) {}

  async listColorsForBlock(blockId: string): Promise<BlockPaintColorItem[]> {
    const block = await this.prisma.block.findUnique({
      where: { id: blockId },
      select: { id: true },
    });
    if (!block) {
      throw new AppError('Bloco não encontrado', 404);
    }

    const colors = await this.prisma.paintColor.findMany({
      where: {
        OR: [
          { productionOrders: { some: { blockId } } },
          { blockLinks: { some: { blockId } } },
        ],
      },
      select: {
        id: true,
        name: true,
        brand: true,
        blockLinks: {
          where: { blockId },
          take: 1,
          select: { mapHex: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    return colors.map((row) => ({
      id: row.id,
      name: row.name,
      brand: row.brand,
      mapHex: row.blockLinks[0]?.mapHex ?? null,
    }));
  }

  async setBlockPaintColorMapHex(
    blockId: string,
    colorId: string,
    mapHex: string,
  ): Promise<BlockPaintColorItem> {
    const block = await this.prisma.block.findUnique({
      where: { id: blockId },
      select: { id: true },
    });
    if (!block) {
      throw new AppError('Bloco não encontrado', 404);
    }

    const color = await this.prisma.paintColor.findUnique({
      where: { id: colorId },
      select: { id: true, name: true, brand: true },
    });
    if (!color) {
      throw new AppError('Cor não encontrada', 404);
    }

    const usedHere = await this.prisma.productionOrder.findFirst({
      where: { blockId, colorId },
      select: { id: true },
    });
    const alreadyLinked = await this.prisma.blockPaintColor.findFirst({
      where: { blockId, colorId },
      select: { id: true },
    });
    if (!usedHere && !alreadyLinked) {
      throw new AppError(
        'Esta cor não está vinculada a OFs deste bloco.',
        400,
      );
    }

    await this.prisma.blockPaintColor.upsert({
      where: {
        blockId_colorId: { blockId, colorId },
      },
      create: {
        blockId,
        colorId,
        mapHex,
      },
      update: { mapHex },
    });

    return {
      id: color.id,
      name: color.name,
      brand: color.brand,
      mapHex,
    };
  }
}
