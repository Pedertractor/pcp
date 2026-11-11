/**
 * Importa as metas semanais do bloco: os CONCATENAR (código da peça + operação) vêm da aba
 * "PMP BALANCEADO" (só os que estão nas séries do bloco) e as quantidades são a soma das linhas
 * da aba "extract_relatorio" com o mesmo CONCATENAR.
 *
 * Meta semanal = ATRASO + DIA01..último dia da semana, dividida igualmente pelos dias úteis.
 * A meta fica no CC (coluna "CC" do balanceado) + operação do CONCATENAR.
 * Apaga todas as metas existentes do bloco antes de importar.
 *
 * Uso: npx tsx src/scripts/import-pmp-weekly-goals-from-balanced.ts <arquivo> [bloco] [inicio-semana]
 * Ex.: npx tsx src/scripts/import-pmp-weekly-goals-from-balanced.ts "C:/Downloads/00_PMP_MODELO_W46_5DIAS.xlsx" Solda 2026-11-09
 */
import XLSX from 'xlsx';
import { prisma } from '../config/prisma.js';

const [
  filePath = 'C:/Users/vanderlei.junior/Downloads/00_PMP_MODELO_W46_5DIAS.xlsx',
  blockName = 'Solda',
  weekStartKey = '2026-11-09',
] = process.argv.slice(2);

const BALANCED_SHEET = 'PMP BALANCEADO';
const EXTRACT_SHEET = 'extract_relatorio';
const WORKING_DAYS = 5;

type GoalDraft = {
  concat: string;
  productCode: string;
  productName: string | null;
  operationId: string;
  daily: number[];
};

function normalizeHeader(value: unknown) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toUpperCase();
}

function stripLeadingZeros(value: unknown) {
  return String(value ?? '').trim().replace(/^0+/, '');
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

function readSheet(workbook: XLSX.WorkBook, name: string, headerName: string) {
  const sheet = workbook.Sheets[name];
  if (!sheet) {
    throw new Error(`Aba "${name}" não encontrada em ${filePath}.`);
  }
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '' });
  const headerIndex = rows.findIndex((row) =>
    row.some((cell) => normalizeHeader(cell) === headerName),
  );
  if (headerIndex < 0) {
    throw new Error(`Coluna "${headerName}" não encontrada na aba "${name}".`);
  }
  const header = rows[headerIndex]!.map(normalizeHeader);
  const column = (columnName: string) => {
    const index = header.indexOf(columnName);
    if (index < 0) {
      throw new Error(`Coluna "${columnName}" não encontrada na aba "${name}".`);
    }
    return index;
  };
  return { rows: rows.slice(headerIndex + 1), column };
}

function splitEvenly(total: number, parts: number): number[] {
  const base = Math.floor(total / parts);
  const remainder = total - base * parts;
  return Array.from({ length: parts }, (_, index) => base + (index < remainder ? 1 : 0));
}

/**
 * Colunas do extract somadas na meta: ATRASO + DIA01 até o último dia da semana. O mês do extract
 * é o do início da semana; dias do mês seguinte usam as colunas "Dxx MES_SEGUINTE".
 */
function buildWeekColumns(weekStart: Date, weekEnd: Date): string[] {
  const columns = ['ATRASO'];
  const date = new Date(Date.UTC(weekStart.getUTCFullYear(), weekStart.getUTCMonth(), 1));
  while (date <= weekEnd) {
    const day = String(date.getUTCDate()).padStart(2, '0');
    columns.push(
      date.getUTCMonth() === weekStart.getUTCMonth() ? `DIA${day}` : `D${day}MES_SEGUINTE`,
    );
    date.setUTCDate(date.getUTCDate() + 1);
  }
  return columns;
}

async function main() {
  const weekStart = addDays(weekStartKey, 0);
  const weekEnd = addDays(weekStartKey, WORKING_DAYS - 1);
  const workingDates = Array.from({ length: WORKING_DAYS }, (_, index) =>
    addDays(weekStartKey, index),
  );

  const block = await prisma.pmpBlock.findUnique({
    where: { name: blockName },
    select: {
      id: true,
      costCenters: {
        select: { costCenter: true, operations: { select: { id: true, operation: true } } },
      },
      series: { select: { parts: { select: { partCode: true, operation: true } } } },
    },
  });
  if (!block) {
    throw new Error(`Bloco PMP "${blockName}" não encontrado.`);
  }
  const seriesConcats = new Set(
    block.series.flatMap((series) =>
      series.parts.map((part) => `${part.partCode}${part.operation}`),
    ),
  );
  if (seriesConcats.size === 0) {
    throw new Error(`Bloco PMP "${blockName}" não tem séries com peças vinculadas.`);
  }
  const operationIdByKey = new Map<string, string>();
  for (const cc of block.costCenters) {
    for (const op of cc.operations) {
      operationIdByKey.set(`${stripLeadingZeros(cc.costCenter)}|${op.operation}`, op.id);
    }
  }

  const workbook = XLSX.readFile(filePath);

  const balanced = readSheet(workbook, BALANCED_SHEET, 'CONCATENAR');
  const balancedCode = balanced.column('CODIGO SOLDA');
  const balancedConcat = balanced.column('CONCATENAR');
  const balancedCostCenter = balanced.column('CC');
  const drafts = new Map<string, GoalDraft>();
  const outsideBlock: string[] = [];
  for (const row of balanced.rows) {
    const productCode = stripLeadingZeros(row[balancedCode]);
    const concat = String(row[balancedConcat] ?? '').trim();
    if (!productCode || !seriesConcats.has(concat) || drafts.has(concat)) continue;
    const operation = Number(concat.slice(productCode.length));
    const costCenter = stripLeadingZeros(row[balancedCostCenter]);
    const operationId = operationIdByKey.get(`${costCenter}|${operation}`);
    if (!operationId) {
      outsideBlock.push(`${concat} (CC ${costCenter} OP ${operation})`);
      continue;
    }
    drafts.set(concat, {
      concat,
      productCode,
      productName: null,
      operationId,
      daily: Array.from({ length: WORKING_DAYS }, () => 0),
    });
  }

  const extract = readSheet(workbook, EXTRACT_SHEET, 'CONCATENAR');
  const extractConcat = extract.column('CONCATENAR');
  const extractDescription = extract.column('DESCRICAO');
  const weekColumns = buildWeekColumns(weekStart, weekEnd).map(extract.column);
  const totals = new Map<string, number>();
  for (const row of extract.rows) {
    const draft = drafts.get(String(row[extractConcat] ?? '').trim());
    if (!draft) continue;
    draft.productName ??= String(row[extractDescription] ?? '').trim() || null;
    const quantity = weekColumns.reduce((sum, index) => sum + toNumber(row[index]), 0);
    totals.set(draft.concat, (totals.get(draft.concat) ?? 0) + quantity);
  }

  const goals = [...drafts.values()].flatMap((draft) => {
    const total = Math.round(totals.get(draft.concat) ?? 0);
    return total > 0 ? [{ ...draft, daily: splitEvenly(total, WORKING_DAYS) }] : [];
  });

  await prisma.$transaction(
    async (tx) => {
      const blockDailyGoals = { weeklyGoal: { pmpBlockId: block.id } };
      await tx.productionGoalLoan.deleteMany({
        where: {
          OR: [{ sourceDailyGoal: blockDailyGoals }, { targetDailyGoal: blockDailyGoals }],
        },
      });
      await tx.productionWeeklyGoal.deleteMany({ where: { pmpBlockId: block.id } });

      for (const draft of goals) {
        await tx.productionWeeklyGoal.create({
          data: {
            pmpBlockId: block.id,
            pmpCostCenterOperationId: draft.operationId,
            productCode: draft.productCode,
            productName: draft.productName,
            weekStart,
            weekEnd,
            plannedQuantity: draft.daily.reduce((sum, value) => sum + value, 0),
            dailyGoals: {
              create: workingDates.map((date, index) => ({
                date,
                plannedQuantity: draft.daily[index]!,
              })),
            },
          },
        });
      }
    },
    { timeout: 120_000 },
  );

  const totalPieces = goals.reduce(
    (sum, draft) => sum + draft.daily.reduce((acc, value) => acc + value, 0),
    0,
  );
  const missing = [...drafts.keys()].filter((concat) => !totals.has(concat));
  console.log(
    `${BALANCED_SHEET}: ${drafts.size} CONCATENAR da série; ${totals.size} encontrados no ${EXTRACT_SHEET}.`,
  );
  console.log(`Semana ${weekStartKey}: ${goals.length} metas semanais, ${totalPieces} peças.`);
  if (outsideBlock.length > 0) {
    console.log(`Sem CC/operação no bloco: ${outsideBlock.join(', ')}`);
  }
  if (missing.length > 0) {
    console.log(`Sem linha no ${EXTRACT_SHEET}: ${missing.join(', ')}`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
