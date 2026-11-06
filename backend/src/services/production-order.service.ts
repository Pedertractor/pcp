import type { PrismaClient } from '../generated/prisma/client.js';
import { AppError } from '../lib/errors.js';
import { toLocalDateKey } from '../lib/excel-serial-date.js';
import type { BlockProductionOrderItem } from '../schemas/production-order.schemas.js';

export class ProductionOrderService {
  constructor(private readonly prisma: PrismaClient) {}

  async listForBlock(blockId: string): Promise<BlockProductionOrderItem[]> {
    const block = await this.prisma.block.findUnique({
      where: { id: blockId },
      select: { id: true },
    });
    if (!block) {
      throw new AppError('Bloco não encontrado', 404);
    }

    const orders = await this.prisma.productionOrder.findMany({
      where: { blockId },
      orderBy: { ofNumber: 'asc' },
      select: {
        id: true,
        ofNumber: true,
        partCode: true,
        operation: true,
        costCenter: true,
        quantity: true,
        area: true,
        statusDate: true,
        status: true,
        machine: { select: { code: true } },
        syncDate: true,
        color: {
          select: {
            name: true,
            blockLinks: {
              where: { blockId },
              take: 1,
              select: { mapHex: true },
            },
          },
        },
      },
    });

    return orders.map(({ machine, color, syncDate, ...order }) => ({
      ...order,
      machineCode: machine?.code ?? null,
      colorName: color?.name ?? null,
      colorMapHex: color?.blockLinks[0]?.mapHex ?? null,
      totalArea: Math.round((order.area ?? 0) * order.quantity * 1000) / 1000,
      syncDate: toLocalDateKey(syncDate),
    }));
  }
}
