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

function paintColorIdentity(raw: string): { name: string; nameKey: string } | null {
  const name = raw.trim().replace(/\s+/g, ' ');
  if (!name) {
    return null;
  }
  return { name, nameKey: name.toLocaleLowerCase('pt-BR') };
}

const SYNCED_STATUS_DATES = {
  HOJE: ProductionOrderStatus.PENDING,
  'NO ATRASO': ProductionOrderStatus.OVERDUE,
} as const;

type SyncedStatusDate = keyof typeof SYNCED_STATUS_DATES;

/** `STATUS_DATA` chega com pontos à esquerda (ex.: `......HOJE`). */
function syncedStatusDate(statusDate: string | null): SyncedStatusDate | null {
  const value = (statusDate ?? '').replace(/^[.\s]+/, '').trim().toUpperCase();
  return value in SYNCED_STATUS_DATES ? (value as SyncedStatusDate) : null;
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
    const inCostCenters = input.rows.filter((row) =>
      costCenterMatches(row.costCenter, costCenters),
    );
    const matched = inCostCenters.filter(
      (row) => syncedStatusDate(row.statusDate) !== null,
    );

    let machinesCreated = 0;
    let ordersCreated = 0;
    let ordersUpdated = 0;

    const machineCache = new Map<string, string>();
    const colorCache = new Map<string, string>();

    for (const row of matched) {
      const lineCode = row.lineCode.trim();
      const machineCode = row.machineCode.trim();
      let machineId = machineCache.get(machineCode);
      if (!machineId) {
        const existingMachine = await this.prisma.machine.findUnique({
          where: { code: machineCode },
          select: { id: true, blockId: true },
        });
        if (existingMachine) {
          if (existingMachine.blockId !== block.id) {
            throw new AppError(
              `Código de máquina já cadastrado em outro bloco: ${machineCode}.`,
              409,
            );
          }
          machineId = existingMachine.id;
        } else {
          const created = await this.prisma.machine.create({
            data: {
              code: machineCode,
              blockId: block.id,
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
      const color = row.colorName ? paintColorIdentity(row.colorName) : null;
      if (color) {
        colorId = colorCache.get(color.nameKey) ?? null;
        if (!colorId) {
          const savedColor = await this.prisma.paintColor.upsert({
            where: { nameKey: color.nameKey },
            create: { name: color.name, nameKey: color.nameKey },
            update: {},
            select: { id: true },
          });
          colorId = savedColor.id;
          colorCache.set(color.nameKey, colorId);
        }
      }

      const existingOrder = await this.prisma.productionOrder.findUnique({
        where: {
          blockId_ofNumber: { blockId: block.id, ofNumber: row.ofNumber },
        },
        select: { id: true, status: true },
      });

      const data = {
        partCode: row.partCode,
        line: lineCode,
        colorId,
        area: row.area,
        operation: row.operation,
        costCenter: normalizeCostCenterCode(row.costCenter),
        statusDate: row.statusDate,
        machineId,
        quantity: row.quantity,
        targetDate: referenceDay,
        syncDate: referenceDay,
        status: SYNCED_STATUS_DATES[syncedStatusDate(row.statusDate)!],
      };

      if (existingOrder) {
        await this.prisma.productionOrder.update({
          where: { id: existingOrder.id },
          data:
            existingOrder.status === ProductionOrderStatus.COMPLETED
              ? { ...data, status: ProductionOrderStatus.COMPLETED }
              : data,
        });
        ordersUpdated += 1;
      } else {
        await this.prisma.productionOrder.create({
          data: { ofNumber: row.ofNumber, blockId: block.id, ...data },
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
      rowsSkippedByStatus: inCostCenters.length - matched.length,
      machinesCreated,
      ordersCreated,
      ordersUpdated,
      demoPositionsAssigned,
    };
  }

  private async assignDemoPositions(blockId: string): Promise<number> {
    const machines = await this.prisma.machine.findMany({
      where: { blockId, positionX: null, positionY: null },
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
