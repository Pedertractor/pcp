/**
 * Simulação do PMP balanceado a partir da planilha de necessidades (DIA01..DIA31 + ATRASO).
 *
 * Meta semanal da peça = ATRASO + soma(DIA01..DIA<ultimo-dia>), fracionada de segunda a sexta.
 * Considera só as linhas cujo par CCUSTO + OPERACAO está cadastrado no bloco
 * e cujo PRODUTO pertence a alguma série do bloco.
 * Apaga todas as metas existentes do bloco antes de importar.
 *
 * Uso: npx tsx src/scripts/simulate-pmp-weekly-goals-from-xls.ts <arquivo> [bloco] [inicio-semana] [ultimo-dia]
 * Ex.: npx tsx src/scripts/simulate-pmp-weekly-goals-from-xls.ts "C:/Downloads/plan.xls" Solda 2026-11-09 13
 */
import XLSX from 'xlsx';
import { prisma } from '../config/prisma.js';

const [
  filePath = 'c:/Users/vanderlei.junior/Downloads/01_2010 a 13_113.xls',
  blockName = 'Solda',
  weekStartKey = '2026-11-09',
  lastDayArg = '13',
] = process.argv.slice(2);

const WORKING_DAYS = 5;

type SheetRow = Record<string, unknown>;

type GoalDraft = {
  productCode: string;
  productName: string | null;
  operationId: string;
  quantity: number;
};

function stripLeadingZeros(value: string) {
  return value.trim().replace(/^0+/, '');
}

function toNumber(value: unknown): number {
  const parsed = typeof value === 'number' ? value : Number(String(value ?? '').replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : 0;
}

function addDays(key: string, days: number): Date {
  const date = new Date(`${key}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date;
}

function splitEvenly(total: number, parts: number): number[] {
  const base = Math.floor(total / parts);
  const remainder = total - base * parts;
  return Array.from({ length: parts }, (_, index) => base + (index < remainder ? 1 : 0));
}

async function main() {
  const lastDay = Number(lastDayArg);
  if (!Number.isInteger(lastDay) || lastDay < 1 || lastDay > 31) {
    throw new Error(`Último dia inválido: ${lastDayArg}`);
  }
  const dayColumns = Array.from(
    { length: lastDay },
    (_, index) => `DIA${String(index + 1).padStart(2, '0')}`,
  );

  const block = await prisma.pmpBlock.findUnique({
    where: { name: blockName },
    select: {
      id: true,
      costCenters: {
        select: {
          costCenter: true,
          operations: { select: { id: true, operation: true } },
        },
      },
      series: { select: { parts: { select: { partCode: true } } } },
    },
  });
  if (!block) {
    throw new Error(`Bloco PMP "${blockName}" não encontrado.`);
  }

  const allowedPartCodes = new Set(
    block.series.flatMap((series) => series.parts.map((part) => part.partCode)),
  );
  if (allowedPartCodes.size === 0) {
    throw new Error(`Bloco PMP "${blockName}" não tem séries com códigos de peça vinculados.`);
  }

  const operationIdByKey = new Map<string, string>();
  for (const cc of block.costCenters) {
    for (const op of cc.operations) {
      operationIdByKey.set(`${stripLeadingZeros(cc.costCenter)}|${op.operation}`, op.id);
    }
  }

  const workbook = XLSX.readFile(filePath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]!]!;
  const rows = XLSX.utils.sheet_to_json<SheetRow>(sheet, { defval: 0 });

  const drafts = new Map<string, GoalDraft>();
  let matchedRows = 0;
  let outsideSeriesRows = 0;
  for (const row of rows) {
    const costCenter = stripLeadingZeros(String(row.CCUSTO ?? ''));
    const operation = Math.trunc(toNumber(row.OPERACAO));
    const operationId = operationIdByKey.get(`${costCenter}|${operation}`);
    if (!operationId) continue;

    const productCode = stripLeadingZeros(String(row.PRODUTO ?? ''));
    if (!productCode) continue;
    if (!allowedPartCodes.has(productCode)) {
      outsideSeriesRows += 1;
      continue;
    }
    matchedRows += 1;

    const quantity = Math.round(
      toNumber(row.ATRASO) + dayColumns.reduce((total, column) => total + toNumber(row[column]), 0),
    );
    if (quantity <= 0) continue;

    const key = `${productCode}|${operationId}`;
    const existing = drafts.get(key);
    if (existing) {
      existing.quantity += quantity;
    } else {
      const description = String(row.DESCRICAO ?? '').trim();
      drafts.set(key, {
        productCode,
        productName: description || null,
        operationId,
        quantity,
      });
    }
  }

  const weekStart = addDays(weekStartKey, 0);
  const weekEnd = addDays(weekStartKey, WORKING_DAYS - 1);
  const workingDates = Array.from({ length: WORKING_DAYS }, (_, index) =>
    addDays(weekStartKey, index),
  );

  await prisma.$transaction(
    async (tx) => {
      const blockDailyGoals = { weeklyGoal: { pmpBlockId: block.id } };
      await tx.productionGoalLoan.deleteMany({
        where: {
          OR: [{ sourceDailyGoal: blockDailyGoals }, { targetDailyGoal: blockDailyGoals }],
        },
      });
      await tx.productionWeeklyGoal.deleteMany({
        where: { pmpBlockId: block.id },
      });

      for (const draft of drafts.values()) {
        const dailyQuantities = splitEvenly(draft.quantity, WORKING_DAYS);
        await tx.productionWeeklyGoal.create({
          data: {
            pmpBlockId: block.id,
            pmpCostCenterOperationId: draft.operationId,
            productCode: draft.productCode,
            productName: draft.productName,
            weekStart,
            weekEnd,
            plannedQuantity: draft.quantity,
            dailyGoals: {
              create: workingDates.map((date, index) => ({
                date,
                plannedQuantity: dailyQuantities[index]!,
              })),
            },
          },
        });
      }
    },
    { timeout: 120_000 },
  );

  const totalPieces = [...drafts.values()].reduce((total, draft) => total + draft.quantity, 0);
  console.log(
    `Planilha: ${rows.length} linhas; ${matchedRows} com CC/operação e peça das séries do bloco "${blockName}"; ${outsideSeriesRows} ignoradas por peça fora das séries.`,
  );
  console.log(
    `Semana ${weekStartKey}: ${drafts.size} metas semanais, ${totalPieces} peças (ATRASO + ${dayColumns[0]}..${dayColumns.at(-1)}), fracionadas em ${WORKING_DAYS} dias.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
