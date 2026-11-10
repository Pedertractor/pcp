import type { PrismaClient } from '../generated/prisma/client.js';
import { ProductionOrderStatus } from '../generated/prisma/enums.js';
import {
  costCenterMatches,
  normalizeCostCenterCode,
} from '../lib/cost-center-code.js';
import { startOfLocalDay } from '../lib/excel-serial-date.js';
import { AppError } from '../lib/errors.js';
import {
  isPlanningStatusHojeOuNoAtraso,
  normalizeStatusDate,
} from '../lib/status-date.js';
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

/** Classificacao de planejamento conhecida -> enum (demais rotulos ficam PENDING). */
const PLANNING_STATUS_BY_LABEL: Partial<
  Record<string, ProductionOrderStatus>
> = {
  HOJE: ProductionOrderStatus.PENDING,
  'NO ATRASO': ProductionOrderStatus.OVERDUE,
};

function planningStatusFromStatusDateRaw(
  statusDate: string | null,
): ProductionOrderStatus {
  const key = normalizeStatusDate(statusDate);
  if (!key) {
    return ProductionOrderStatus.PENDING;
  }
  return PLANNING_STATUS_BY_LABEL[key] ?? ProductionOrderStatus.PENDING;
}

type OrderExecutionState = 'completed' | 'in_progress' | 'planning';

async function orderExecutionStateFromProcesses(
  prisma: PrismaClient,
  orderId: string,
  orderQuantity: number,
): Promise<OrderExecutionState> {
  const processes = await prisma.productionProcess.findMany({
    where: { productionOrderId: orderId },
    select: { startedAt: true, finishedAt: true, quantity: true, quantityReported: true },
  });
  if (processes.length === 0) {
    return 'planning';
  }

  let closedQty = 0;
  let hasOpen = false;

  for (const proc of processes) {
    if (proc.finishedAt) {
      const qty =
        proc.quantityReported != null && proc.quantityReported >= 0
          ? proc.quantityReported
          : Math.max(proc.quantity, 0);
      closedQty += qty;
      continue;
    }
    if (proc.startedAt) {
      hasOpen = true;
    }
  }

  if (hasOpen) {
    return 'in_progress';
  }

  const expected = orderQuantity > 0 ? orderQuantity : 0;
  if (expected > 0 && closedQty >= expected) {
    return 'completed';
  }

  const allFinished = processes.every((p) => p.finishedAt !== null);
  if (allFinished && processes.length > 0) {
    return 'completed';
  }

  return 'planning';
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
    const syncedRows = inCostCenters.filter((row) =>
      isPlanningStatusHojeOuNoAtraso(row.statusDate),
    );

    let machinesCreated = 0;
    let ordersCreated = 0;
    let ordersUpdated = 0;

    const machineCache = new Map<string, string>();
    const colorCache = new Map<string, string>();
    const touchedOrderIds = new Set<string>();

    for (const row of syncedRows) {
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
        select: { id: true, status: true, quantity: true },
      });

      const planningStatus = planningStatusFromStatusDateRaw(row.statusDate);
      const baseData = {
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
        status: planningStatus,
      };

      if (existingOrder) {
        const data =
          existingOrder.status === ProductionOrderStatus.COMPLETED
            ? { ...baseData, status: ProductionOrderStatus.COMPLETED }
            : baseData;

        await this.prisma.productionOrder.update({
          where: { id: existingOrder.id },
          data,
        });
        touchedOrderIds.add(existingOrder.id);
        ordersUpdated += 1;
      } else {
        const created = await this.prisma.productionOrder.create({
          data: { ofNumber: row.ofNumber, blockId: block.id, ...baseData },
          select: { id: true },
        });
        touchedOrderIds.add(created.id);
        ordersCreated += 1;
      }
    }

    if (touchedOrderIds.size > 0) {
      await this.reconcileTouchedOrdersExecutionStatus(
        block.id,
        touchedOrderIds,
      );
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
      rowsMatched: syncedRows.length,
      rowsSkippedByStatus: inCostCenters.length - syncedRows.length,
      machinesCreated,
      ordersCreated,
      ordersUpdated,
      demoPositionsAssigned,
    };
  }

  /**
   * Processos (consulta de execucao) prevalecem: concluido / em andamento;
   * senao mantem o status derivado do planejamento.
   */
  private async reconcileTouchedOrdersExecutionStatus(
    blockId: string,
    orderIds: Set<string>,
  ): Promise<void> {
    const ids = [...orderIds];
    if (ids.length === 0) {
      return;
    }

    const orders = await this.prisma.productionOrder.findMany({
      where: { id: { in: ids }, blockId },
      select: { id: true, quantity: true, status: true },
    });

    await Promise.all(
      orders.map(async (order) => {
        const execution = await orderExecutionStateFromProcesses(
          this.prisma,
          order.id,
          order.quantity,
        );

        if (execution === 'completed') {
          await this.prisma.productionOrder.update({
            where: { id: order.id },
            data: {
              status: ProductionOrderStatus.COMPLETED,
              completedAt: new Date(),
            },
          });
          return;
        }

        if (execution === 'in_progress') {
          if (order.status === ProductionOrderStatus.COMPLETED) {
            return;
          }
          await this.prisma.productionOrder.update({
            where: { id: order.id },
            data: {
              status: ProductionOrderStatus.IN_PROGRESS,
              completedAt: null,
            },
          });
          return;
        }

        // Sem processo executando/concluido: status permanece o gravado pelo planejamento nesta sync.
      }),
    );
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
