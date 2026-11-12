import type { Prisma, PrismaClient } from '../generated/prisma/client.js';
import { AppError } from '../lib/errors.js';

/** Semana do PMP: segunda a sexta. O sábado (dia extra) é `weekStart + 5`. */
export const WORKING_DAYS_PER_WEEK = 5;
export const EXTRA_DAY_OFFSET = 5;

type Tx = Prisma.TransactionClient;

/** Colunas `@db.Date` chegam como meia-noite UTC. */
function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function fromDateKey(key: string): Date {
  return new Date(`${key}T00:00:00.000Z`);
}

export function addDaysToKey(key: string, days: number): string {
  const date = fromDateKey(key);
  date.setUTCDate(date.getUTCDate() + days);
  return toDateKey(date);
}

/** Data de hoje no fuso local do servidor, como AAAA-MM-DD. */
export function localTodayKey(now: Date = new Date()): string {
  return toDateKey(new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())));
}

/** Divide `total` em `parts` inteiros; o resto vai para os primeiros dias. */
export function splitEvenly(total: number, parts: number): number[] {
  if (parts <= 0) {
    return [];
  }
  const base = Math.floor(total / parts);
  const remainder = total % parts;
  return Array.from({ length: parts }, (_, index) => base + (index < remainder ? 1 : 0));
}

/**
 * Redistribui o saldo da meta semanal entre os dias a partir de `fromKey` (inclusive).
 * Dias anteriores mantêm a meta planejada como histórico; o saldo é
 * `meta semanal − produzido nos dias anteriores`. Idempotente.
 * Retorna `true` se alguma meta diária mudou.
 */
export async function redistributeWeeklyGoal(
  tx: Tx,
  weeklyGoalId: string,
  fromKey: string,
): Promise<boolean> {
  const goal = await tx.productionWeeklyGoal.findUnique({
    where: { id: weeklyGoalId },
    select: {
      plannedQuantity: true,
      dailyGoals: {
        orderBy: { date: 'asc' },
        select: { id: true, date: true, plannedQuantity: true, producedQuantity: true },
      },
    },
  });
  if (!goal) {
    return false;
  }

  const pastDays = goal.dailyGoals.filter((day) => toDateKey(day.date) < fromKey);
  const nextDays = goal.dailyGoals.filter((day) => toDateKey(day.date) >= fromKey);
  if (nextDays.length === 0) {
    return false;
  }

  const producedBefore = pastDays.reduce((total, day) => total + day.producedQuantity, 0);
  const remaining = Math.max(0, goal.plannedQuantity - producedBefore);
  const split = splitEvenly(remaining, nextDays.length);

  let changed = false;
  for (const [index, day] of nextDays.entries()) {
    const plannedQuantity = split[index] ?? 0;
    if (day.plannedQuantity !== plannedQuantity) {
      await tx.productionDailyGoal.update({
        where: { id: day.id },
        data: { plannedQuantity },
      });
      changed = true;
    }
  }
  return changed;
}

export type PmpRedistributionResult = {
  todayKey: string;
  evaluatedGoals: number;
  updatedGoals: number;
};

export class PmpRedistributionService {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Rotina noturna: para metas da semana corrente, joga o saldo não atingido
   * dos dias anteriores para os dias restantes (a partir de hoje).
   */
  async redistributeCurrentWeeks(
    todayKey: string = localTodayKey(),
  ): Promise<PmpRedistributionResult> {
    const goals = await this.prisma.productionWeeklyGoal.findMany({
      where: {
        weekStart: {
          gte: fromDateKey(addDaysToKey(todayKey, -EXTRA_DAY_OFFSET)),
          lt: fromDateKey(todayKey),
        },
      },
      select: { id: true },
    });

    let updatedGoals = 0;
    for (const goal of goals) {
      const changed = await this.prisma.$transaction((tx) =>
        redistributeWeeklyGoal(tx, goal.id, todayKey),
      );
      if (changed) {
        updatedGoals += 1;
      }
    }

    return { todayKey, evaluatedGoals: goals.length, updatedGoals };
  }

  private async findGoal(blockId: string, goalId: string) {
    const goal = await this.prisma.productionWeeklyGoal.findFirst({
      where: { id: goalId, pmpBlockId: blockId },
      select: {
        id: true,
        weekStart: true,
        dailyGoals: {
          select: {
            id: true,
            date: true,
            producedQuantity: true,
            _count: { select: { orders: true, loansGiven: true, loansReceived: true } },
          },
        },
      },
    });
    if (!goal) {
      throw new AppError('Meta semanal não encontrada', 404);
    }
    const weekStartKey = toDateKey(goal.weekStart);
    const saturdayKey = addDaysToKey(weekStartKey, EXTRA_DAY_OFFSET);
    const saturday = goal.dailyGoals.find((day) => toDateKey(day.date) === saturdayKey) ?? null;
    return { goal, weekStartKey, saturdayKey, saturday };
  }

  /**
   * Abre o sábado (somente semana atual) e redistribui o saldo do dia base
   * (padrão: hoje) até o sábado.
   */
  async openExtraDay(blockId: string, goalId: string, fromKey?: string): Promise<void> {
    const todayKey = localTodayKey();
    const { goal, weekStartKey, saturdayKey, saturday } = await this.findGoal(blockId, goalId);

    if (todayKey < weekStartKey || todayKey > saturdayKey) {
      throw new AppError('O sábado só pode ser aberto na semana atual.', 400);
    }
    if (saturday) {
      throw new AppError('O sábado já está aberto para esta peça.', 409);
    }

    const baseKey = fromKey ?? todayKey;
    if (baseKey < todayKey || baseKey > saturdayKey) {
      throw new AppError('O dia base deve estar entre hoje e o sábado.', 400);
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.productionDailyGoal.create({
        data: { weeklyGoalId: goal.id, date: fromDateKey(saturdayKey), plannedQuantity: 0 },
      });
      await redistributeWeeklyGoal(tx, goal.id, baseKey);
    });
  }

  /** Fecha o sábado (até sexta, sem produção/OFs) e devolve o saldo aos dias úteis. */
  async closeExtraDay(blockId: string, goalId: string): Promise<void> {
    const todayKey = localTodayKey();
    const { goal, weekStartKey, saturday } = await this.findGoal(blockId, goalId);

    if (!saturday) {
      throw new AppError('O sábado não está aberto para esta peça.', 404);
    }
    const fridayKey = addDaysToKey(weekStartKey, WORKING_DAYS_PER_WEEK - 1);
    if (todayKey > fridayKey) {
      throw new AppError('O sábado só pode ser fechado até sexta-feira.', 400);
    }
    const { orders, loansGiven, loansReceived } = saturday._count;
    if (saturday.producedQuantity > 0 || orders > 0 || loansGiven > 0 || loansReceived > 0) {
      throw new AppError('O sábado já tem produção ou OFs alocadas e não pode ser fechado.', 409);
    }

    const baseKey = todayKey > weekStartKey ? todayKey : weekStartKey;
    await this.prisma.$transaction(async (tx) => {
      await tx.productionDailyGoal.delete({ where: { id: saturday.id } });
      await redistributeWeeklyGoal(tx, goal.id, baseKey);
    });
  }
}
