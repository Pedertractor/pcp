import type { PrismaClient } from '../generated/prisma/client.js';
import { ProductionOrderStatus } from '../generated/prisma/enums.js';
import {
  costCenterMatches,
  normalizeCostCenterCode,
} from '../lib/cost-center-code.js';
import { startOfLocalDay } from '../lib/excel-serial-date.js';
import { AppError } from '../lib/errors.js';
import type { PlanningRow, PlanningSyncResult } from '../types/planning.types.js';

type SyncInput = {
  blockId: string;
  referenceDate: Date;
  costCenters: string[];
  rows: PlanningRow[];
  assignDemoPositions?: boolean;
};

function mapOrderStatus(statusDate: string | null): ProductionOrderStatus {
  const value = (statusDate ?? '').toUpperCase();
  if (value.includes('NO ATRASO')) {
    return ProductionOrderStatus.OVERDUE;
  }
  if (value.includes('HOJE')) {
    return ProductionOrderStatus.PENDING;
  }
  return ProductionOrderStatus.PENDING;
}

export class ProductionPlanningSyncService {
  constructor(private readonly prisma: PrismaClient) {}

  async syncFromRows(input: SyncInput): Promise<PlanningSyncResult> {
    const costCenters = [
      ...new Set(input.costCenters.map(normalizeCostCenterCode)),
    ].filter(Boolean);
    if (costCenters.length === 0) {
      throw new AppError('Informe ao menos um centro de custo.', 400);
    }

    const block = await this.prisma.block.findUnique({
      where: { id: input.blockId },
      select: {
        id: true,
        costCenters: { select: { costCenter: true } },
      },
    });
    if (!block) {
      throw new AppError('Bloco não encontrado', 404);
    }

    const blockCostCenters = new Set(
      block.costCenters.map((item) => normalizeCostCenterCode(item.costCenter)),
    );
    const missingOnBlock = costCenters.filter((cc) => !blockCostCenters.has(cc));
    if (missingOnBlock.length > 0) {
      throw new AppError(
        `Centro de custo não vinculado ao bloco: ${missingOnBlock.join(', ')}.`,
        400,
      );
    }

    const referenceDay = startOfLocalDay(input.referenceDate);
    const matched = input.rows.filter((row) =>
      costCenterMatches(row.costCenter, costCenters),
    );

    let linesCreated = 0;
    let machinesCreated = 0;
    let ordersCreated = 0;
    let ordersUpdated = 0;

    const lineCache = new Map<string, string>();
    const machineCache = new Map<string, string>();
    const colorCache = new Map<string, string>();

    for (const row of matched) {
      const lineCode = row.lineCode.trim();
      let lineId = lineCache.get(lineCode);
      if (!lineId) {
        const existingLine = await this.prisma.line.findUnique({
          where: { blockId_code: { blockId: block.id, code: lineCode } },
          select: { id: true },
        });
        if (existingLine) {
          lineId = existingLine.id;
        } else {
          const created = await this.prisma.line.create({
            data: { blockId: block.id, code: lineCode },
            select: { id: true },
          });
          lineId = created.id;
          linesCreated += 1;
        }
        lineCache.set(lineCode, lineId);
      }

      const machineCode = row.machineCode.trim();
      let machineId = machineCache.get(machineCode);
      if (!machineId) {
        const existingMachine = await this.prisma.machine.findUnique({
          where: { code: machineCode },
          select: { id: true },
        });
        if (existingMachine) {
          machineId = existingMachine.id;
        } else {
          const created = await this.prisma.machine.create({
            data: {
              code: machineCode,
              lineId,
              costCenter: normalizeCostCenterCode(row.costCenter),
            },
            select: { id: true },
          });
          machineId = created.id;
          machinesCreated += 1;
        }
        machineCache.set(machineCode, machineId);
      }

      let colorId: string | null = null;
      if (row.colorName) {
        const colorKey = row.colorName.trim();
        colorId = colorCache.get(colorKey) ?? null;
        if (!colorId) {
          const existingColor = await this.prisma.paintColor.findFirst({
            where: { name: colorKey, brand: null },
            select: { id: true },
          });
          if (existingColor) {
            colorId = existingColor.id;
          } else {
            const createdColor = await this.prisma.paintColor.create({
              data: { name: colorKey },
              select: { id: true },
            });
            colorId = createdColor.id;
          }
          colorCache.set(colorKey, colorId);
        }
      }

      const existingOrder = await this.prisma.productionOrder.findUnique({
        where: { ofNumber: row.ofNumber },
        select: { id: true },
      });

      const data = {
        partCode: row.partCode,
        blockId: block.id,
        line: lineCode,
        colorId,
        area: row.area,
        operation: row.operation,
        costCenter: normalizeCostCenterCode(row.costCenter),
        statusDate: row.statusDate,
        machineId,
        quantity: row.quantity,
        targetDate: referenceDay,
        status: mapOrderStatus(row.statusDate),
      };

      if (existingOrder) {
        await this.prisma.productionOrder.update({
          where: { id: existingOrder.id },
          data,
        });
        ordersUpdated += 1;
      } else {
        await this.prisma.productionOrder.create({
          data: { ofNumber: row.ofNumber, ...data },
        });
        ordersCreated += 1;
      }
    }

    let demoPositionsAssigned = 0;
    if (input.assignDemoPositions) {
      demoPositionsAssigned = await this.assignDemoPositions(block.id);
    }

    await this.prisma.block.update({
      where: { id: block.id },
      data: { updatedAt: new Date() },
    });

    return {
      blockId: block.id,
      referenceDate: referenceDay.toISOString().slice(0, 10),
      costCenters,
      rowsRead: input.rows.length,
      rowsMatched: matched.length,
      linesCreated,
      machinesCreated,
      ordersCreated,
      ordersUpdated,
      demoPositionsAssigned,
    };
  }

  private async assignDemoPositions(blockId: string): Promise<number> {
    const machines = await this.prisma.machine.findMany({
      where: { line: { blockId }, positionX: null, positionY: null },
      orderBy: { code: 'asc' },
      select: { id: true },
    });
    if (machines.length === 0) {
      return 0;
    }

    const cols = Math.ceil(Math.sqrt(machines.length));
    const rows = Math.ceil(machines.length / cols);

    await this.prisma.$transaction(
      machines.map((machine, index) => {
        const col = index % cols;
        const row = Math.floor(index / cols);
        const positionX =
          cols === 1 ? 50 : 8 + (col / (cols - 1)) * 84;
        const positionY =
          rows === 1 ? 50 : 12 + (row / (rows - 1)) * 76;

        return this.prisma.machine.update({
          where: { id: machine.id },
          data: { positionX, positionY },
        });
      }),
    );

    return machines.length;
  }
}
