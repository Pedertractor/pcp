/**
 * Vincula uma série ao bloco PMP com as linhas da aba "PMP BALANCEADO".
 * Cada linha vira peça ("CODIGO SOLDA") + operação, extraída do "CONCATENAR" (código da peça + operação).
 * Substitui todas as peças já cadastradas na série.
 *
 * Uso: npx tsx src/scripts/link-pmp-series-from-xlsx.ts <arquivo> [bloco] [serie]
 * Ex.: npx tsx src/scripts/link-pmp-series-from-xlsx.ts "C:/Downloads/00_PMP_MODELO_W46_5DIAS.xlsx" Solda A
 */
import XLSX from 'xlsx';
import { prisma } from '../config/prisma.js';

const [
  filePath = 'C:/Users/vanderlei.junior/Downloads/00_PMP_MODELO_W46_5DIAS.xlsx',
  blockName = 'Solda',
  seriesName = 'A',
] = process.argv.slice(2);

const SHEET_NAME = 'PMP BALANCEADO';
const PART_CODE_HEADER = 'CODIGO SOLDA';
const CONCAT_HEADER = 'CONCATENAR';

type SeriesPart = { partCode: string; operation: number };

function normalizeHeader(value: unknown) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toUpperCase();
}

function readParts() {
  const workbook = XLSX.readFile(filePath);
  const sheet = workbook.Sheets[SHEET_NAME];
  if (!sheet) {
    throw new Error(`Aba "${SHEET_NAME}" não encontrada em ${filePath}.`);
  }

  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '' });
  const headerIndex = rows.findIndex((row) =>
    row.some((cell) => normalizeHeader(cell) === PART_CODE_HEADER),
  );
  if (headerIndex < 0) {
    throw new Error(`Coluna "${PART_CODE_HEADER}" não encontrada na aba "${SHEET_NAME}".`);
  }
  const header = rows[headerIndex]!.map(normalizeHeader);
  const codeColumn = header.indexOf(PART_CODE_HEADER);
  const concatColumn = header.indexOf(CONCAT_HEADER);
  if (concatColumn < 0) {
    throw new Error(`Coluna "${CONCAT_HEADER}" não encontrada na aba "${SHEET_NAME}".`);
  }

  const parts = new Map<string, SeriesPart>();
  const invalid: string[] = [];
  for (const row of rows.slice(headerIndex + 1)) {
    const partCode = String(row[codeColumn] ?? '').trim().replace(/^0+/, '');
    const concat = String(row[concatColumn] ?? '').trim();
    if (!partCode) continue;
    const operation = concat.startsWith(partCode) ? Number(concat.slice(partCode.length)) : NaN;
    if (!Number.isInteger(operation) || operation <= 0) {
      invalid.push(`${partCode} (CONCATENAR "${concat}")`);
      continue;
    }
    parts.set(`${partCode}|${operation}`, { partCode, operation });
  }
  return { parts: [...parts.values()], invalid };
}

async function main() {
  const { parts, invalid } = readParts();
  if (parts.length === 0) {
    throw new Error('Nenhuma peça + operação encontrada na planilha.');
  }

  const block = await prisma.pmpBlock.findUnique({
    where: { name: blockName },
    select: { id: true },
  });
  if (!block) {
    throw new Error(`Bloco PMP "${blockName}" não encontrado.`);
  }

  await prisma.$transaction(async (tx) => {
    const series = await tx.pmpSeries.upsert({
      where: { pmpBlockId_name: { pmpBlockId: block.id, name: seriesName } },
      create: { pmpBlockId: block.id, name: seriesName },
      update: {},
      select: { id: true },
    });
    await tx.pmpSeriesPart.deleteMany({ where: { pmpSeriesId: series.id } });
    await tx.pmpSeriesPart.createMany({
      data: parts.map((part) => ({ pmpSeriesId: series.id, ...part })),
    });
  });

  const partCodes = new Set(parts.map((part) => part.partCode));
  console.log(
    `Série "${seriesName}" do bloco "${blockName}": ${parts.length} CONCATENAR (${partCodes.size} peças).`,
  );
  if (invalid.length > 0) {
    console.log(`Linhas ignoradas por CONCATENAR sem operação válida: ${invalid.join(', ')}`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
