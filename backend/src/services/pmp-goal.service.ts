import type { PrismaClient } from '../generated/prisma/client.js';
import { AppError } from '../lib/errors.js';
import type {
  PmpBlockWeek,
  PmpWeeklyGoalDetail,
  PmpWeeklyGoalItem,
} from '../schemas/pmp-goal.schemas.js';

/** Colunas `@db.Date` chegam como meia-noite UTC. */
function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function fromDateKey(key: string): Date {
  return new Date(`${key}T00:00:00.000Z`);
}

const weeklyGoalInclude = {
  pmpCostCenterOperation: {
    select: {
      operation: true,
      pmpCostCenter: { select: { costCenter: true, sectorName: true } },
    },
  },
  _count: { select: { dailyGoals: true } },
} as const;

type WeeklyGoalRow = {
  id: string;
  productCode: string;
  productName: string | null;
  weekStart: Date;
  weekEnd: Date;
  plannedQuantity: number;
  producedQuantity: number;
  pmpCostCenterOperation: {
    operation: number;
    pmpCostCenter: { costCenter: string; sectorName: string | null };
  };
  _count: { dailyGoals: number };
};

function toWeeklyGoalItem(goal: WeeklyGoalRow): PmpWeeklyGoalItem {
  return {
    id: goal.id,
    productCode: goal.productCode,
    productName: goal.productName,
    costCenter: goal.pmpCostCenterOperation.pmpCostCenter.costCenter,
    sectorName: goal.pmpCostCenterOperation.pmpCostCenter.sectorName,
    operation: goal.pmpCostCenterOperation.operation,
    weekStart: toDateKey(goal.weekStart),
    weekEnd: toDateKey(goal.weekEnd),
    plannedQuantity: goal.plannedQuantity,
    producedQuantity: goal.producedQuantity,
    daysCount: goal._count.dailyGoals,
  };
}

export class PmpGoalService {
  constructor(private readonly prisma: PrismaClient) {}

  private async ensureBlock(blockId: string) {
    const block = await this.prisma.pmpBlock.findUnique({
      where: { id: blockId },
      select: { id: true, name: true },
    });
    if (!block) {
      throw new AppError('Bloco PMP não encontrado', 404);
    }
    return block;
  }

  async listWeeks(blockId: string): Promise<PmpBlockWeek[]> {
    await this.ensureBlock(blockId);

    const groups = await this.prisma.productionWeeklyGoal.groupBy({
      by: ['weekStart', 'weekEnd'],
      where: { pmpBlockId: blockId },
      _count: { _all: true },
      _sum: { plannedQuantity: true, producedQuantity: true },
      orderBy: { weekStart: 'desc' },
    });

    return groups.map((group) => ({
      weekStart: toDateKey(group.weekStart),
      weekEnd: toDateKey(group.weekEnd),
      goalsCount: group._count._all,
      plannedQuantity: group._sum.plannedQuantity ?? 0,
      producedQuantity: group._sum.producedQuantity ?? 0,
    }));
  }

  async listWeeklyGoals(
    blockId: string,
    weekStart: string,
  ): Promise<PmpWeeklyGoalItem[]> {
    await this.ensureBlock(blockId);

    const goals = await this.prisma.productionWeeklyGoal.findMany({
      where: { pmpBlockId: blockId, weekStart: fromDateKey(weekStart) },
      include: weeklyGoalInclude,
      orderBy: [{ productCode: 'asc' }],
    });

    return goals
      .map(toWeeklyGoalItem)
      .sort(
        (a, b) =>
          a.productCode.localeCompare(b.productCode, 'pt-BR', { numeric: true }) ||
          a.costCenter.localeCompare(b.costCenter, 'pt-BR', { numeric: true }) ||
          a.operation - b.operation,
      );
  }

  async getWeeklyGoal(
    blockId: string,
    goalId: string,
  ): Promise<PmpWeeklyGoalDetail> {
    const block = await this.ensureBlock(blockId);

    const goal = await this.prisma.productionWeeklyGoal.findFirst({
      where: { id: goalId, pmpBlockId: blockId },
      include: {
        ...weeklyGoalInclude,
        dailyGoals: {
          orderBy: { date: 'asc' },
          include: {
            orders: { orderBy: { externalOrderId: 'asc' } },
            loansGiven: { select: { borrowedQuantity: true } },
            loansReceived: { select: { borrowedQuantity: true } },
          },
        },
      },
    });
    if (!goal) {
      throw new AppError('Meta semanal não encontrada', 404);
    }

    return {
      ...toWeeklyGoalItem(goal),
      blockId: block.id,
      blockName: block.name,
      dailyGoals: goal.dailyGoals.map((day) => ({
        id: day.id,
        date: toDateKey(day.date),
        plannedQuantity: day.plannedQuantity,
        producedQuantity: day.producedQuantity,
        anticipatedQuantity: day.loansGiven.reduce(
          (total, loan) => total + loan.borrowedQuantity,
          0,
        ),
        deductedQuantity: day.loansReceived.reduce(
          (total, loan) => total + loan.borrowedQuantity,
          0,
        ),
        orders: day.orders.map((order) => ({
          id: order.id,
          externalOrderId: order.externalOrderId,
          operation: order.operation,
          allocatedQuantity: order.allocatedQuantity,
          producedQuantity: order.producedQuantity,
        })),
      })),
    };
  }
}
